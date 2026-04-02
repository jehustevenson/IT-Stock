import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('assignments')
    .update({
      status:        'Returned',
      returned_date: body.returnedDate,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark asset as Available and clear assignment fields
  await supabase
    .from('assets')
    .update({
      status:         'Available',
      assigned_to:    null,
      assigned_to_id: null,
      department:     null,
    })
    .eq('asset_tag', data.asset_tag);

  await supabase.from('audit_logs').insert({
    action:      'Returned',
    asset_tag:   data.asset_tag,
    asset_name:  data.asset_name,
    performed_by: user.email ?? 'Admin (IT)',
    details:     `Returned by ${data.staff_name} (${data.staff_id}) — ${data.department}`,
  });

  return NextResponse.json(data);
}
