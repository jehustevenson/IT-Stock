import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth-utils';
import { sendEmail, waybillPendingEmail } from '@/lib/email';
import { toWaybill, type DBWaybill, type DBWaybillItem } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

// ─── GET /api/waybills — list (newest first) ─────────────────────────────────

export async function GET() {
  const authResult = await checkAuth('viewer');
  if (authResult instanceof NextResponse) return authResult;

  const supabase = await createClient();

  const { data: waybills, error } = await supabase
    .from('waybills')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (waybills ?? []).map((w) => w.id);
  let items: DBWaybillItem[] = [];
  if (ids.length > 0) {
    const { data } = await supabase.from('waybill_items').select('*').in('waybill_id', ids);
    items = data ?? [];
  }

  const byWaybill = new Map<string, DBWaybillItem[]>();
  for (const it of items) {
    const arr = byWaybill.get(it.waybill_id) ?? [];
    arr.push(it);
    byWaybill.set(it.waybill_id, arr);
  }

  return NextResponse.json({
    data: (waybills ?? []).map((w: DBWaybill) => toWaybill(w, byWaybill.get(w.id) ?? [])),
  });
}

// ─── POST /api/waybills — create, lands in "Pending IT Approval" ─────────────

interface ItemInput {
  assetId?: string | null;
  description?: unknown;
  serialNumber?: unknown;
  qty?: unknown;
  purpose?: unknown;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
  const authResult = await checkAuth('operator');
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const supabase = await createClient();
  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 });
  }
  const b = raw as Record<string, unknown>;

  // ── Validate header fields ───────────────────────────────────────────────
  if (typeof b.date !== 'string' || !DATE_RE.test(b.date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }
  if (typeof b.companyName !== 'string' || !b.companyName.trim()) {
    return NextResponse.json({ error: 'companyName is required' }, { status: 400 });
  }
  if (typeof b.recipientName !== 'string' || !b.recipientName.trim()) {
    return NextResponse.json({ error: 'recipientName is required' }, { status: 400 });
  }
  if (b.expectedReturn !== undefined && b.expectedReturn !== null && b.expectedReturn !== '' &&
      (typeof b.expectedReturn !== 'string' || !DATE_RE.test(b.expectedReturn))) {
    return NextResponse.json({ error: 'expectedReturn must be YYYY-MM-DD' }, { status: 400 });
  }

  // ── Validate items ───────────────────────────────────────────────────────
  if (!Array.isArray(b.items) || b.items.length === 0) {
    return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
  }
  if (b.items.length > 50) {
    return NextResponse.json({ error: 'Too many items (max 50)' }, { status: 400 });
  }
  const items = (b.items as ItemInput[]).map((it, i) => {
    const qty = typeof it.qty === 'number' ? it.qty : parseInt(String(it.qty ?? '1'), 10);
    return {
      asset_id:      typeof it.assetId === 'string' && it.assetId ? it.assetId : null,
      description:   typeof it.description === 'string' ? it.description.trim() : '',
      serial_number: typeof it.serialNumber === 'string' && it.serialNumber.trim() ? it.serialNumber.trim() : null,
      qty:           Number.isFinite(qty) && qty > 0 ? qty : 1,
      purpose:       typeof it.purpose === 'string' && it.purpose.trim() ? it.purpose.trim() : null,
      position:      i,
    };
  });
  if (items.some((it) => !it.description)) {
    return NextResponse.json({ error: 'Every item needs a description' }, { status: 400 });
  }

  // ── Generate waybill number: WB-<year>-NNNN ─────────────────────────────
  const year = new Date().getFullYear();
  const prefix = `WB-${year}-`;
  const { count } = await supabase
    .from('waybills')
    .select('id', { count: 'exact', head: true })
    .like('waybill_no', `${prefix}%`);
  const waybillNo = `${prefix}${String((count ?? 0) + 1).padStart(4, '0')}`;

  // ── Insert header + items ────────────────────────────────────────────────
  const { data: waybill, error } = await supabase
    .from('waybills')
    .insert({
      waybill_no:      waybillNo,
      date:            b.date,
      company_name:    (b.companyName as string).trim(),
      company_address: typeof b.companyAddress === 'string' && b.companyAddress.trim()
        ? (b.companyAddress as string).trim() : null,
      recipient_name:  (b.recipientName as string).trim(),
      expected_return: typeof b.expectedReturn === 'string' && b.expectedReturn ? b.expectedReturn : null,
      created_by:      user.email ?? 'Unknown',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: insertedItems, error: itemsErr } = await supabase
    .from('waybill_items')
    .insert(items.map((it) => ({ ...it, waybill_id: waybill.id })))
    .select();

  if (itemsErr) {
    await supabase.from('waybills').delete().eq('id', waybill.id);
    return NextResponse.json({ error: `Failed to save items: ${itemsErr.message}` }, { status: 500 });
  }

  await supabase.from('audit_logs').insert({
    action:       'Added',
    asset_tag:    waybill.waybill_no,
    asset_name:   `Waybill → ${waybill.company_name}`,
    performed_by: user.email ?? 'Admin (IT)',
    details:      `Waybill created with ${items.length} item(s) — pending IT approval`,
  });

  // ── Notify the IT manager ────────────────────────────────────────────────
  const itManager = process.env.IT_MANAGER_EMAIL;
  if (itManager) {
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
    const { subject, html } = waybillPendingEmail(
      waybill.waybill_no, 'IT', waybill.company_name, waybill.recipient_name,
      items.length, appUrl, waybill.id,
    );
    await sendEmail(itManager, subject, html);
  }

  return NextResponse.json(toWaybill(waybill, insertedItems ?? []), { status: 201 });
}
