import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const status     = searchParams.get('status');
  const department = searchParams.get('department');
  const search     = searchParams.get('search');

  let query = supabase
    .from('assignments')
    .select('*')
    .order('date_assigned', { ascending: false });

  if (status)     query = query.eq('status', status);
  if (department) query = query.eq('department', department);
  if (search) {
    query = query.or(
      `staff_name.ilike.%${search}%,staff_id.ilike.%${search}%,asset_tag.ilike.%${search}%,asset_name.ilike.%${search}%,department.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Find asset UUID from tag
  const { data: asset, error: assetErr } = await supabase
    .from('assets')
    .select('id, name, status')
    .eq('asset_tag', body.assetTag)
    .single();

  if (assetErr || !asset) {
    return NextResponse.json({ error: `Asset ${body.assetTag} not found` }, { status: 404 });
  }

  // Guard: prevent assigning an asset that is already actively assigned
  if (asset.status === 'Assigned') {
    // Check if there's an active/overdue assignment for this asset
    const { data: activeAssignment } = await supabase
      .from('assignments')
      .select('id, staff_name, staff_id')
      .eq('asset_tag', body.assetTag)
      .in('status', ['Active', 'Overdue'])
      .limit(1)
      .maybeSingle();

    if (activeAssignment) {
      return NextResponse.json(
        {
          error: `Asset ${body.assetTag} is already assigned to ${activeAssignment.staff_name} (${activeAssignment.staff_id}). Please process a return before reassigning.`,
        },
        { status: 409 }
      );
    }
  }

  // Guard: prevent assigning a faulty or retired asset
  if (asset.status === 'Faulty') {
    return NextResponse.json(
      { error: `Asset ${body.assetTag} is marked as Faulty and cannot be assigned.` },
      { status: 409 }
    );
  }

  if (asset.status === 'Retired') {
    return NextResponse.json(
      { error: `Asset ${body.assetTag} is Retired and cannot be assigned.` },
      { status: 409 }
    );
  }

  // Validate dates
  if (body.expectedReturn && body.dateAssigned) {
    if (new Date(body.expectedReturn) <= new Date(body.dateAssigned)) {
      return NextResponse.json(
        { error: 'Expected return date must be after the assignment date.' },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from('assignments')
    .insert({
      asset_id:        asset.id,
      asset_tag:       body.assetTag,
      asset_name:      body.assetName,
      category:        body.category,
      staff_name:      body.staffName,
      staff_id:        body.staffId,
      department:      body.department,
      date_assigned:   body.dateAssigned,
      expected_return: body.expectedReturn,
      status:          'Active',
      notes:           body.notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark asset as Assigned
  await supabase
    .from('assets')
    .update({
      status:         'Assigned',
      assigned_to:    body.staffName,
      assigned_to_id: body.staffId,
      department:     body.department,
    })
    .eq('id', asset.id);

  await supabase.from('audit_logs').insert({
    action:       'Assigned',
    asset_tag:    body.assetTag,
    asset_name:   body.assetName,
    performed_by: user.email ?? 'Admin (IT)',
    details:      `Assigned to ${body.staffName} (${body.staffId}) — ${body.department}`,
  });

  return NextResponse.json(data, { status: 201 });
}