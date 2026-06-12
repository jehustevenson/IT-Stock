import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth-utils';
import { sendEmail, waybillPendingEmail } from '@/lib/email';
import { toWaybill } from '@/lib/supabase/types';

type Params = { params: Promise<{ id: string }> };

function approverStage(email: string | undefined): 'IT' | 'Security' | null {
  if (!email) return null;
  const e = email.toLowerCase();
  if ((process.env.IT_MANAGER_EMAIL ?? '').toLowerCase() === e) return 'IT';
  if ((process.env.SECURITY_MANAGER_EMAIL ?? '').toLowerCase() === e) return 'Security';
  return null;
}

// ─── GET /api/waybills/[id] — detail + whether the viewer can act ────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const authResult = await checkAuth('viewer');
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const supabase = await createClient();
  const { id } = await params;

  const { data: waybill, error } = await supabase
    .from('waybills').select('*').eq('id', id).single();
  if (error || !waybill) return NextResponse.json({ error: 'Waybill not found' }, { status: 404 });

  const { data: items } = await supabase
    .from('waybill_items').select('*').eq('waybill_id', id);

  const stage = approverStage(user.email ?? undefined);
  const viewerCanApprove =
    (waybill.status === 'Pending IT Approval' && stage === 'IT') ||
    (waybill.status === 'Pending Security Approval' && stage === 'Security');

  return NextResponse.json({
    ...toWaybill(waybill, items ?? []),
    viewerCanApprove,
    viewerStage: stage,
  });
}

// ─── PATCH /api/waybills/[id] — approve or reject the current stage ─────────

export async function PATCH(request: NextRequest, { params }: Params) {
  const authResult = await checkAuth('viewer'); // gate is the designated email, not role
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const supabase = await createClient();
  const { id } = await params;
  const raw = await request.json().catch(() => null);
  const action = raw?.action as string | undefined;
  const reason = typeof raw?.reason === 'string' ? raw.reason.trim() : '';

  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
  }

  const { data: waybill, error } = await supabase
    .from('waybills').select('*').eq('id', id).single();
  if (error || !waybill) return NextResponse.json({ error: 'Waybill not found' }, { status: 404 });

  if (waybill.status === 'Approved' || waybill.status === 'Rejected') {
    return NextResponse.json({ error: `Waybill is already ${waybill.status}.` }, { status: 409 });
  }

  const stage = approverStage(user.email ?? undefined);
  const required: 'IT' | 'Security' = waybill.status === 'Pending IT Approval' ? 'IT' : 'Security';

  if (stage !== required) {
    return NextResponse.json(
      { error: `This waybill is awaiting the ${required} manager's decision. You are not the designated approver for this stage.` },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();
  let update: Record<string, unknown>;
  let auditDetails: string;

  if (action === 'reject') {
    update = {
      status: 'Rejected',
      rejected_by: user.email,
      rejected_at: now,
      rejection_reason: reason || null,
    };
    auditDetails = `Waybill rejected at ${required} stage${reason ? ` — ${reason}` : ''}`;
  } else if (required === 'IT') {
    update = {
      status: 'Pending Security Approval',
      it_approved_by: user.email,
      it_approved_at: now,
    };
    auditDetails = 'Waybill approved by IT manager — pending security approval';
  } else {
    update = {
      status: 'Approved',
      security_approved_by: user.email,
      security_approved_at: now,
    };
    auditDetails = 'Waybill fully approved (IT + Security)';
  }

  const { data: updated, error: updErr } = await supabase
    .from('waybills').update(update).eq('id', id).select().single();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    action:       action === 'reject' ? 'Flagged' : 'Updated',
    asset_tag:    updated.waybill_no,
    asset_name:   `Waybill → ${updated.company_name}`,
    performed_by: user.email ?? 'Admin (IT)',
    details:      auditDetails,
  });

  // Hand off to the security manager after IT approval.
  if (action === 'approve' && required === 'IT') {
    const securityManager = process.env.SECURITY_MANAGER_EMAIL;
    if (securityManager) {
      const { count } = await supabase
        .from('waybill_items').select('id', { count: 'exact', head: true }).eq('waybill_id', id);
      const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
      const { subject, html } = waybillPendingEmail(
        updated.waybill_no, 'Security', updated.company_name, updated.recipient_name,
        count ?? 0, appUrl, updated.id,
      );
      await sendEmail(securityManager, subject, html);
    }
  }

  const { data: items } = await supabase
    .from('waybill_items').select('*').eq('waybill_id', id);

  return NextResponse.json(toWaybill(updated, items ?? []));
}
