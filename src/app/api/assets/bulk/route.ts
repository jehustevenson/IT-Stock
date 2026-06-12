import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth-utils';
import { validateAssetCreate, type AssetCreateInput } from '@/lib/validators';
import { SCHOOL_PREFIX, CATEGORY_CODE } from '@/lib/assetUtils';
import type { AssetCategory, SchoolSection } from '@/lib/supabase/types';

/**
 * Bulk-create assets from a parsed CSV/spreadsheet upload.
 *
 * The client parses the file and sends an array of camelCase asset rows.
 * The server re-validates each row (never trust the client), skips rows
 * whose asset_tag already exists, and inserts the rest in a single batch.
 *
 * Asset tag auto-generation:
 *   Rows that leave `assetTag` blank but supply `school` + `category` get a
 *   deterministic tag of the form `{SCHOOL_PREFIX}-{CATEGORY_CODE}-{NNNN}`,
 *   with NNNN chosen as max(existing_sequence) + 1 per (school, category).
 *   This keeps the school's usual prefix convention and guarantees uniqueness
 *   across both the existing DB and the rest of the batch.
 *
 * Response shape intentionally mirrors per-row outcomes so the UI can render
 * a granular summary rather than a single blunt success/failure.
 */

const MAX_ROWS = 1000;

type RowOutcome =
  | { row: number; status: 'inserted'; assetTag: string }
  | { row: number; status: 'skipped';  assetTag: string; reason: string }
  | { row: number; status: 'error';    assetTag: string | null; error: string };

const SCHOOL_SECTIONS: SchoolSection[] = ['Infant School', 'Junior School', 'Secondary School'];
const ASSET_CATEGORIES: AssetCategory[] = [
  'Laptop', 'Desktop', 'Monitor', 'Printer',
  'Networking', 'Accessory', 'Server', 'Phone',
  'iPad', 'System Unit', 'Interactive Screen',
];

export async function POST(request: NextRequest) {
  const authResult = await checkAuth('operator');
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const raw = await request.json().catch(() => null);
  if (!raw || !Array.isArray(raw.rows)) {
    return NextResponse.json(
      { error: 'Body must be { rows: Array<AssetRow> }' },
      { status: 400 }
    );
  }

  const rows: unknown[] = raw.rows;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No rows to import' }, { status: 400 });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Too many rows (${rows.length}). Max ${MAX_ROWS} per upload.` },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // ── Pass 0: auto-generate asset tags where missing ─────────────────────
  // We look at every (school, category) combo that needs tag generation,
  // query the current max sequence number for that prefix in one go, then
  // assign sequential numbers to each row needing one. This avoids N round-
  // trips and the random-collision risk of generateTag().
  const { needsGeneration, normalizedRows } = prepareRows(rows);

  if (needsGeneration.size > 0) {
    const nextSeq = await loadNextSequences(supabase, needsGeneration);
    for (const row of normalizedRows) {
      if (row.autoGenerate && row.school && row.category) {
        const key  = `${row.school}|${row.category}`;
        const n    = nextSeq.get(key) ?? 1;
        const tag  = formatTag(row.school, row.category, n);
        nextSeq.set(key, n + 1);
        row.input.assetTag = tag;
      }
    }
  }

  // ── Pass 1: validate every row, collect per-row outcomes ──────────────
  const results: RowOutcome[] = [];
  const validRows: Array<{ row: number; body: ReturnType<typeof toInsertPayload> }> = [];
  const seenInBatch = new Set<string>();

  normalizedRows.forEach(({ input, rowNum, autoGenerationError }) => {
    if (autoGenerationError) {
      results.push({ row: rowNum, status: 'error', assetTag: null, error: autoGenerationError });
      return;
    }

    const parsed = validateAssetCreate(input);
    if (!parsed.ok) {
      const tag = typeof input.assetTag === 'string' ? input.assetTag : null;
      results.push({ row: rowNum, status: 'error', assetTag: tag, error: parsed.error });
      return;
    }

    if (seenInBatch.has(parsed.value.assetTag)) {
      results.push({
        row:      rowNum,
        status:   'skipped',
        assetTag: parsed.value.assetTag,
        reason:   'Duplicate asset_tag within this upload',
      });
      return;
    }
    seenInBatch.add(parsed.value.assetTag);

    validRows.push({ row: rowNum, body: toInsertPayload(parsed.value) });
  });

  // ── Pass 2: look up which tags already exist in the DB ────────────────
  if (validRows.length > 0) {
    const tagsToCheck = validRows.map((v) => v.body.asset_tag);
    const { data: existing, error: lookupErr } = await supabase
      .from('assets')
      .select('asset_tag')
      .in('asset_tag', tagsToCheck);

    if (lookupErr) {
      return NextResponse.json({ error: lookupErr.message }, { status: 500 });
    }

    const existingTags = new Set((existing ?? []).map((r) => r.asset_tag));

    const toInsert: typeof validRows = [];
    for (const v of validRows) {
      if (existingTags.has(v.body.asset_tag)) {
        results.push({
          row:      v.row,
          status:   'skipped',
          assetTag: v.body.asset_tag,
          reason:   'Asset tag already exists in inventory',
        });
      } else {
        toInsert.push(v);
      }
    }

    // ── Pass 3: bulk insert the survivors ────────────────────────────────
    if (toInsert.length > 0) {
      const { data: inserted, error: insertErr } = await supabase
        .from('assets')
        .insert(toInsert.map((v) => v.body))
        .select('asset_tag, name');

      if (insertErr) {
        for (const v of toInsert) {
          results.push({
            row:      v.row,
            status:   'error',
            assetTag: v.body.asset_tag,
            error:    insertErr.message,
          });
        }
      } else {
        for (const v of toInsert) {
          results.push({
            row:      v.row,
            status:   'inserted',
            assetTag: v.body.asset_tag,
          });
        }

        if (inserted && inserted.length > 0) {
          await supabase.from('audit_logs').insert(
            inserted.map((a) => ({
              action:       'Added' as const,
              asset_tag:    a.asset_tag,
              asset_name:   a.name,
              performed_by: user.email ?? 'Admin (IT)',
              details:      'Bulk CSV import',
            }))
          );
        }
      }
    }
  }

  results.sort((a, b) => a.row - b.row);

  const summary = {
    total:    rows.length,
    inserted: results.filter((r) => r.status === 'inserted').length,
    skipped:  results.filter((r) => r.status === 'skipped').length,
    errored:  results.filter((r) => r.status === 'error').length,
  };

  return NextResponse.json({ summary, results });
}

// ─── Row normalization + auto-tag helpers ────────────────────────────────

interface NormalizedRow {
  rowNum:               number;
  input:                Record<string, unknown>;
  autoGenerate:         boolean;
  school:               SchoolSection | null;
  category:             AssetCategory | null;
  autoGenerationError:  string | null;
}

function prepareRows(rows: unknown[]): {
  normalizedRows:   NormalizedRow[];
  needsGeneration:  Set<string>; // "school|category" keys
} {
  const normalizedRows: NormalizedRow[] = [];
  const needsGeneration = new Set<string>();

  rows.forEach((raw, i) => {
    const rowNum = i + 2; // +1 header, +1 humans-count-from-1
    const input  = raw && typeof raw === 'object' ? { ...(raw as Record<string, unknown>) } : {};

    // Treat blank/whitespace assetTag as missing so spreadsheets don't send
    // empty strings.
    const rawTag = input.assetTag;
    const tagIsBlank = rawTag === undefined || rawTag === null ||
      (typeof rawTag === 'string' && rawTag.trim() === '');

    // Lenient matching: trim, collapse spaces, ignore case, allow school
    // shorthand ("Junior" → "Junior School"). Write the canonical value back
    // into the row so validateAssetCreate (which is strict) accepts it.
    const school   = normalizeSchool(input.school);
    const category = normalizeCategory(input.category);
    const status   = normalizeStatus(input.status);
    if (school)   input.school   = school;
    if (category) input.category = category;
    if (status)   input.status   = status;

    if (!tagIsBlank) {
      normalizedRows.push({ rowNum, input, autoGenerate: false, school, category, autoGenerationError: null });
      return;
    }

    // assetTag is missing — we need school + category to auto-generate.
    if (!school || !category) {
      const missing = [!school && 'school', !category && 'category'].filter(Boolean).join(' + ');
      normalizedRows.push({
        rowNum,
        input,
        autoGenerate: false,
        school,
        category,
        autoGenerationError:
          `assetTag is blank and cannot be auto-generated without ${missing}. ` +
          `Either fill in assetTag or provide school and category.`,
      });
      return;
    }

    needsGeneration.add(`${school}|${category}`);
    normalizedRows.push({
      rowNum,
      input,
      autoGenerate: true,
      school,
      category,
      autoGenerationError: null,
    });
  });

  return { normalizedRows, needsGeneration };
}

/**
 * For each (school, category) combo that needs auto-generation, query the
 * highest numeric suffix already in use and return the next sequence number
 * to start from. Returns a Map keyed by "school|category".
 */
async function loadNextSequences(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  combos: Set<string>,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();

  // Sequential awaits are fine here — typically we only have a handful of
  // (school, category) combos per upload.
  for (const key of combos) {
    const [school, category] = key.split('|') as [SchoolSection, AssetCategory];
    const prefix  = `${SCHOOL_PREFIX[school]}-${CATEGORY_CODE[category]}-`;

    const { data } = await supabase
      .from('assets')
      .select('asset_tag')
      .like('asset_tag', `${prefix}%`);

    let maxN = 0;
    for (const row of (data ?? []) as { asset_tag: string }[]) {
      const suffix = row.asset_tag.slice(prefix.length);
      const n = parseInt(suffix, 10);
      if (!Number.isNaN(n) && n > maxN) maxN = n;
    }
    // Keep 4-digit width by starting from at least 1000. If the inventory
    // ever exceeds 9999 per combo, formatTag will still produce a longer
    // string rather than truncating.
    out.set(key, Math.max(maxN + 1, 1000));
  }

  return out;
}

function formatTag(school: SchoolSection, category: AssetCategory, n: number): string {
  return `${SCHOOL_PREFIX[school]}-${CATEGORY_CODE[category]}-${String(n).padStart(4, '0')}`;
}

function cleaned(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().replace(/\s+/g, ' ').toLowerCase();
  return s.length > 0 ? s : null;
}

function normalizeSchool(v: unknown): SchoolSection | null {
  const s = cleaned(v);
  if (!s) return null;
  for (const section of SCHOOL_SECTIONS) {
    const full = section.toLowerCase();
    if (s === full || s === full.replace(' school', '')) return section;
  }
  return null;
}

function normalizeCategory(v: unknown): AssetCategory | null {
  const s = cleaned(v);
  if (!s) return null;
  return ASSET_CATEGORIES.find((c) => c.toLowerCase() === s) ?? null;
}

const ASSET_STATUSES = ['Available', 'Assigned', 'Faulty', 'Retired'] as const;

function normalizeStatus(v: unknown): string | null {
  const s = cleaned(v);
  if (!s) return null;
  return ASSET_STATUSES.find((st) => st.toLowerCase() === s) ?? null;
}

function toInsertPayload(v: AssetCreateInput) {
  return {
    asset_tag:      v.assetTag,
    name:           v.name,
    category:       v.category,
    serial_number:  v.serialNumber,
    purchase_date:  v.purchaseDate,
    status:         v.status ?? 'Available',
    location:       v.location,
    school:         v.school         ?? null,
    assigned_to:    v.assignedTo     ?? null,
    assigned_to_id: v.assignedToId   ?? null,
    department:     v.department     ?? null,
    notes:          v.notes          ?? null,
    supplier:       v.supplier       ?? null,
    purchase_cost:  v.purchaseCost   ?? null,
  };
}
