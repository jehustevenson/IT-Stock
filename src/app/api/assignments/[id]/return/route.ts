import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth-utils';
import { validateAssignmentReturn } from '@/lib/validators';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const authResult = await checkAuth('operator');
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const supabase = await createClient();
  const { id } = await params;
  const raw = await request.json().catch(() => null);

  const parsed = validateAssignmentReturn(raw);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = parsed.value;

  // Fetch the assignment first to confirm it exists and is returnable
  const { data: existing, error: fetchErr } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  if (existing.status === 'Returned') {
    return NextResponse.json({ error: 'Assignment is already marked as returned' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('assignments')
    .update({
      status: 'Returned',
      returned_date: body.returnedDate,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark asset as Available and clear assignment fields
  const { error: assetErr } = await supabase
    .from('assets')
    .update({
      status: 'Available',
      assigned_to: null,
      assigned_to_id: null,
      department: null,
    })
    .eq('asset_tag', data.asset_tag);

  if (assetErr) {
    // Roll the assignment back so the two tables stay consistent.
    await supabase
      .from('assignments')
      .update({ status: existing.status, returned_date: existing.returned_date })
      .eq('id', id);
    return NextResponse.json(
      { error: `Failed to update asset availability: ${assetErr.message}` },
      { status: 500 }
    );
  }

  // Build audit log details including condition and notes if provided
  const condition   = body.condition ? ` — Condition: ${body.condition}` : '';
  const returnNotes = body.notes     ? `. Notes: ${body.notes}`          : '';
  const details     = `Returned by ${data.staff_name} (${data.staff_id}) — ${data.department}${condition}${returnNotes}`;

  await supabase.from('audit_logs').insert({
    action: 'Returned',
    asset_tag: data.asset_tag,
    asset_name: data.asset_name,
    performed_by: user.email ?? 'Admin (IT)',
    details,
  });

  return NextResponse.json(data);
}
