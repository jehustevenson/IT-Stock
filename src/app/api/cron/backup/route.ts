// src/app/api/cron/backup/route.ts
//
// Weekly safety-net backup: exports all rows from assets, assignments and
// audit_logs as CSV files into the private `backups` Supabase Storage bucket
// (one folder per run, named by date). Keeps the last 8 weekly backups.
//
// Requirements:
//   - SUPABASE_SERVICE_ROLE_KEY env var (server-only — never expose to client)
//   - A private Storage bucket named `backups` in the Supabase project
//   - Vercel cron configured in vercel.json (sends Bearer CRON_SECRET)

import { createClient } from '@supabase/supabase-js';

const TABLES = ['assets', 'assignments', 'audit_logs'] as const;
const BUCKET = 'backups';
const KEEP_RUNS = 8;
const PAGE_SIZE = 1000;

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    console.error('CRON_SECRET is not set');
    return new Response('Server misconfiguration', { status: 500 });
  }
  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set — backups need it to bypass RLS and write to Storage');
    return new Response('Server misconfiguration', { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const runFolder = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const results: Record<string, number> = {};

  try {
    // ── Export each table ───────────────────────────────────────────────────
    for (const table of TABLES) {
      const rows: Record<string, unknown>[] = [];
      for (let page = 0; page < 50; page += 1) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .order('id', { ascending: true })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (error) throw new Error(`${table}: ${error.message}`);
        rows.push(...(data ?? []));
        if (!data || data.length < PAGE_SIZE) break;
      }

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(`${runFolder}/${table}.csv`, toCsv(rows), {
          contentType: 'text/csv',
          upsert: true,
        });
      if (uploadErr) throw new Error(`upload ${table}: ${uploadErr.message}`);

      results[table] = rows.length;
    }

    // ── Prune old runs (keep newest KEEP_RUNS folders) ─────────────────────
    const { data: folders } = await supabase.storage.from(BUCKET).list('', {
      sortBy: { column: 'name', order: 'desc' },
    });
    const oldRuns = (folders ?? [])
      .map((f) => f.name)
      .filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n))
      .slice(KEEP_RUNS);

    for (const folder of oldRuns) {
      const { data: files } = await supabase.storage.from(BUCKET).list(folder);
      if (files && files.length > 0) {
        await supabase.storage
          .from(BUCKET)
          .remove(files.map((f) => `${folder}/${f.name}`));
      }
    }

    return Response.json({
      success: true,
      backup: runFolder,
      rows: results,
      pruned: oldRuns,
    });
  } catch (err) {
    console.error('Backup failed:', err);
    return Response.json({ success: false, error: String(err) }, { status: 500 });
  }
}
