import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
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
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
      assigned_to:    body.assignedTo    ?? null,
      assigned_to_id: body.assignedToId  ?? null,
      department:     body.department    ?? null,
      notes:          body.notes         ?? null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    action:      'Updated',
    asset_tag:   data.asset_tag,
    asset_name:  data.name,
    performed_by: user.email ?? 'Admin (IT)',
    details:     `Asset details updated`,
  });

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('assets')
    .update({ status: body.status })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    action:      body.status === 'Faulty' ? 'Flagged' : 'Updated',
    asset_tag:   data.asset_tag,
    asset_name:  data.name,
    performed_by: user.email ?? 'Admin (IT)',
    details:     `Status changed to ${body.status}`,
  });

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch before deleting so we can log it
  const { data: asset } = await supabase
    .from('assets')
    .select('asset_tag, name')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('assets').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (asset) {
    await supabase.from('audit_logs').insert({
      action:      'Deleted',
      asset_tag:   asset.asset_tag,
      asset_name:  asset.name,
      performed_by: user.email ?? 'Admin (IT)',
      details:     `Asset permanently removed from inventory`,
    });
  }

  return NextResponse.json({ success: true });
}
