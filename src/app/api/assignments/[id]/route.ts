import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAuth, hasPermission } from '@/lib/auth-utils';
import { validateAssignmentUpdate } from '@/lib/validators';

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/assignments/[id] — edit the expected return date.
 * Status is recomputed: a non-returned assignment becomes Active if the new
 * date is today/future, Overdue if it's already past.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const authResult = await checkAuth('manager');
  if (authResult instanceof NextResponse) return authResult;
  const { user, role } = authResult;

  if (!hasPermission(role, 'assignment:update')) {
    return NextResponse.json(
      { error: 'You do not have permission to update assignments' },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const { id } = await params;
  const raw = await request.json().catch(() => null);

  const parsed = validateAssignmentUpdate(raw);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { expectedReturn } = parsed.value;

  const { data: existing, error: fetchErr } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  if (existing.status === 'Returned') {
    return NextResponse.json(
      { error: 'This assignment is closed — the asset was already returned.' },
      { status: 409 }
    );
  }

  if (new Date(expectedReturn) <= new Date(existing.date_assigned)) {
    return NextResponse.json(
      { error: 'Expected return date must be after the assignment date.' },
      { status: 400 }
    );
  }

  // Recompute status against UTC midnight today.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  const newStatus = expectedReturn < todayStr ? 'Overdue' : 'Active';

  const { data, error } = await supabase
    .from('assignments')
    .update({ expected_return: expectedReturn, status: newStatus })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    action:       'Updated',
    asset_tag:    data.asset_tag,
    asset_name:   data.asset_name,
    performed_by: user.email ?? 'Admin (IT)',
    details:      `Expected return changed from ${existing.expected_return} to ${expectedReturn} — ${data.staff_name} (${data.staff_id})`,
  });

  return NextResponse.json(data);
}
