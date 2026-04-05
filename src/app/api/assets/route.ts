import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const status   = searchParams.get('status');
  const school   = searchParams.get('school');
  const search   = searchParams.get('search');

  let query = supabase.from('assets').select('*').order('asset_tag', { ascending: true });

  if (category) query = query.eq('category', category);
  if (status)   query = query.eq('status', status);
  if (school)   query = query.eq('school', school);
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,asset_tag.ilike.%${search}%,serial_number.ilike.%${search}%,location.ilike.%${search}%,assigned_to.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}


export async function POST(request: NextRequest) {
  const authResult = await checkAuth('operator');
  if (authResult instanceof NextResponse) return authResult;
  const supabase = await createClient();
  const body = await request.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('assets')
    .insert({
      asset_tag:      body.assetTag,
      name:           body.name,
      category:       body.category,
      serial_number:  body.serialNumber,
      purchase_date:  body.purchaseDate,
      status:         body.status ?? 'Available',
      location:       body.location,
      school:         body.school ?? null,
      assigned_to:    body.assignedTo    ?? null,
      assigned_to_id: body.assignedToId  ?? null,
      department:     body.department    ?? null,
      notes:          body.notes         ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    action:       'Added',
    asset_tag:    data.asset_tag,
    asset_name:   data.name,
    performed_by: user.email ?? 'Admin (IT)',
    details:      `New asset added to inventory — ${data.school ? data.school + ', ' : ''}${data.location}`,
  });

  return NextResponse.json(data, { status: 201 });
}