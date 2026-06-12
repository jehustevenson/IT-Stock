import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth-utils';
import { validateAssetUpdate, validateAssetStatusPatch } from '@/lib/validators';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const authResult = await checkAuth('viewer');
  if (authResult instanceof NextResponse) return authResult;

  const supabase = await createClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const authResult = await checkAuth('operator');
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const supabase = await createClient();
  const { id } = await params;
  const raw = await request.json().catch(() => null);

  const parsed = validateAssetUpdate(raw);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = parsed.value;

  // Enforce the same transition rules as the status PATCH so the edit modal
  // can't bypass them.
  const { data: current, error: loadErr } = await supabase
    .from('assets')
    .select('id, asset_tag, status')
    .eq('id', id)
    .maybeSingle();

  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 });
  if (!current) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

  if (body.status !== current.status) {
    if (body.status === 'Assigned') {
      return NextResponse.json(
        {
          error:
            'Cannot set status to Assigned directly. Create an assignment for this asset instead.',
        },
        { status: 409 }
      );
    }
    if (current.status === 'Assigned') {
      const { data: activeAssignment } = await supabase
        .from('assignments')
        .select('id, staff_name, staff_id')
        .eq('asset_tag', current.asset_tag)
        .in('status', ['Active', 'Overdue'])
        .limit(1)
        .maybeSingle();

      if (activeAssignment) {
        return NextResponse.json(
          {
            error:
              `Asset ${current.asset_tag} is currently assigned to ${activeAssignment.staff_name} ` +
              `(${activeAssignment.staff_id}). Process a return before changing its status.`,
          },
          { status: 409 }
        );
      }
    }
  }

  const { data, error } = await supabase
    .from('assets')
    .update({
      asset_tag:      body.assetTag,
      name:           body.name,
      category:       body.category,
      serial_number:  body.serialNumber,
      purchase_date:  body.purchaseDate,
      status:         body.status,
      location:       body.location,
      school:         body.school ?? null,
      assigned_to:    body.assignedTo    ?? null,
      assigned_to_id: body.assignedToId  ?? null,
      department:     body.department    ?? null,
      notes:          body.notes         ?? null,
      supplier:       body.supplier      ?? null,
      purchase_cost:  body.purchaseCost  ?? null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    action:       'Updated',
    asset_tag:    data.asset_tag,
    asset_name:   data.name,
    performed_by: user.email ?? 'Admin (IT)',
    details:      `Asset details updated`,
  });

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const authResult = await checkAuth('operator');
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const supabase = await createClient();
  const { id } = await params;
  const raw = await request.json().catch(() => null);

  const parsed = validateAssetStatusPatch(raw);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { status } = parsed.value;

  // ── Load the current asset so we can enforce legal transitions ─────────
  const { data: current, error: loadErr } = await supabase
    .from('assets')
    .select('id, asset_tag, name, status')
    .eq('id', id)
    .maybeSingle();

  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 });
  if (!current) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

  // No-op: writing the same status shouldn't count as a change and shouldn't
  // spawn an audit row.
  if (current.status === status) {
    return NextResponse.json(current);
  }

  // ── Transition guards ──────────────────────────────────────────────────
  // `Assigned` is a derived state — it is set by the assignment-create flow
  // (which also populates assigned_to / assigned_to_id / department) and
  // cleared by the return flow. Allowing the inline status dropdown to write
  // it would leave those fields blank and/or create an Assigned asset with
  // no owning assignment.
  if (status === 'Assigned') {
    return NextResponse.json(
      {
        error:
          'Cannot set status to Assigned directly. Create an assignment for this asset instead.',
      },
      { status: 409 }
    );
  }

  // Moving out of `Assigned` while there's still an Active/Overdue
  // assignment would leave the assignment orphaned. Require the user to
  // process a return first.
  if (current.status === 'Assigned') {
    const { data: activeAssignment, error: asgnErr } = await supabase
      .from('assignments')
      .select('id, staff_name, staff_id')
      .eq('asset_tag', current.asset_tag)
      .in('status', ['Active', 'Overdue'])
      .limit(1)
      .maybeSingle();

    if (asgnErr) return NextResponse.json({ error: asgnErr.message }, { status: 500 });

    if (activeAssignment) {
      return NextResponse.json(
        {
          error:
            `Asset ${current.asset_tag} is currently assigned to ${activeAssignment.staff_name} ` +
            `(${activeAssignment.staff_id}). Process a return before changing its status.`,
        },
        { status: 409 }
      );
    }
  }

  // ── Apply the update ────────────────────────────────────────────────────
  // If moving off `Assigned` (orphaned-assignment case cleared above), also
  // clear the denormalized assignee fields so the row stops claiming to be
  // held by someone.
  // `status` has been narrowed to non-'Assigned' by the guard above.
  const update: Record<string, unknown> = { status };
  if (current.status === 'Assigned') {
    update.assigned_to    = null;
    update.assigned_to_id = null;
    update.department     = null;
  }

  const { data, error } = await supabase
    .from('assets')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    action:       status === 'Faulty' ? 'Flagged' : 'Updated',
    asset_tag:    data.asset_tag,
    asset_name:   data.name,
    performed_by: user.email ?? 'Admin (IT)',
    details:      `Status changed from ${current.status} to ${status}`,
  });

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await checkAuth('manager');
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const supabase = await createClient();
  const { id } = await params;

  const { data: asset } = await supabase
    .from('assets')
    .select('asset_tag, name')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('assets').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (asset) {
    await supabase.from('audit_logs').insert({
      action:       'Deleted',
      asset_tag:    asset.asset_tag,
      asset_name:   asset.name,
      performed_by: user.email ?? 'Admin (IT)',
      details:      `Asset permanently removed from inventory`,
    });
  }

  return NextResponse.json({ success: true });
}
