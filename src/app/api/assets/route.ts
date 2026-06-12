import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth-utils';
import { validateAssetCreate, sanitizeSearchTerm } from '@/lib/validators';
import type { AssetCategory, AssetStatus, SchoolSection } from '@/lib/supabase/types';

// Pagination defaults
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function GET(request: NextRequest) {
  const authResult = await checkAuth('viewer');
  if (authResult instanceof NextResponse) return authResult;

  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const status   = searchParams.get('status');
  const school   = searchParams.get('school');
  const search   = searchParams.get('search');

  const limit = Math.min(
    Math.max(parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);

  let query = supabase
    .from('assets')
    .select('*', { count: 'exact' })
    .order('asset_tag', { ascending: true })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq('category', category as AssetCategory);
  if (status)   query = query.eq('status',   status   as AssetStatus);
  if (school)   query = query.eq('school',   school   as SchoolSection);
  if (search) {
    const term = sanitizeSearchTerm(search);
    if (term) {
      query = query.or(
        `name.ilike.%${term}%,asset_tag.ilike.%${term}%,serial_number.ilike.%${term}%,location.ilike.%${term}%,assigned_to.ilike.%${term}%`
      );
    }
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data,
    pagination: {
      offset,
      limit,
      total: count ?? 0,
      hasMore: (offset + limit) < (count ?? 0),
    },
  });
}

export async function POST(request: NextRequest) {
  const authResult = await checkAuth('operator');
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const supabase = await createClient();
  const raw = await request.json().catch(() => null);

  const parsed = validateAssetCreate(raw);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = parsed.value;

  // Check for duplicate asset_tag before inserting
  const { data: existing } = await supabase
    .from('assets')
    .select('id')
    .eq('asset_tag', body.assetTag)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: `Asset tag ${body.assetTag} already exists. Please use the regenerate button to get a unique tag.` },
      { status: 409 }
    );
  }

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
      school:         body.school         ?? null,
      assigned_to:    body.assignedTo     ?? null,
      assigned_to_id: body.assignedToId   ?? null,
      department:     body.department     ?? null,
      notes:          body.notes          ?? null,
      supplier:       body.supplier       ?? null,
      purchase_cost:  body.purchaseCost   ?? null,
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
