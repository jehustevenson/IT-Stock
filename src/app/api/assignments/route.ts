import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAuth, hasPermission } from '@/lib/auth-utils';
import { validateAssignmentCreate, sanitizeSearchTerm } from '@/lib/validators';
import type { AssignmentStatus } from '@/lib/supabase/types';

// Pagination defaults
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function GET(request: NextRequest) {
  // Check authorization - viewer can read
  const authResult = await checkAuth('viewer');
  if (authResult instanceof NextResponse) return authResult;

  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const status     = searchParams.get('status');
  const department = searchParams.get('department');
  const search     = searchParams.get('search');

  // Pagination
  const limit  = Math.min(
    Math.max(parseInt(searchParams.get('limit')  ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);

  let query = supabase
    .from('assignments')
    .select('*', { count: 'exact' })
    .order('date_assigned', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status)     query = query.eq('status', status as AssignmentStatus);
  if (department) query = query.eq('department', department);
  if (search) {
    const term = sanitizeSearchTerm(search);
    if (term) {
      query = query.or(
        `staff_name.ilike.%${term}%,staff_id.ilike.%${term}%,asset_tag.ilike.%${term}%,asset_name.ilike.%${term}%,department.ilike.%${term}%`
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
  // Check authorization - operator can create
  const authResult = await checkAuth('operator');
  if (authResult instanceof NextResponse) return authResult;
  const { user, role } = authResult;

  // Additional check - make sure user has permission
  if (!hasPermission(role, 'assignment:create')) {
    return NextResponse.json(
      { error: 'You do not have permission to create assignments' },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const raw = await request.json().catch(() => null);

  const parsed = validateAssignmentCreate(raw);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = parsed.value;

  // ── Fetch the asset by tag so we can validate & use its id ──────────────
  const { data: asset, error: assetErr } = await supabase
    .from('assets')
    .select('id, asset_tag, name, category, status')
    .eq('asset_tag', body.assetTag)
    .maybeSingle();

  if (assetErr) {
    return NextResponse.json({ error: assetErr.message }, { status: 500 });
  }

  if (!asset) {
    return NextResponse.json(
      { error: `Asset ${body.assetTag} not found.` },
      { status: 404 }
    );
  }

  // ── Guard: prevent double-booking by checking for an existing Active/Overdue assignment ──
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

  // ── Guard: prevent assigning a faulty or retired asset ──────────────────
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

  // ── Cross-field date validation ─────────────────────────────────────────
  // NOTE: validators.ts already enforces YYYY-MM-DD format. We compare
  // against UTC midnight to keep "today" consistent across timezones.
  const dateAssigned   = new Date(body.dateAssigned);
  const expectedReturn = new Date(body.expectedReturn);

  if (expectedReturn <= dateAssigned) {
    return NextResponse.json(
      { error: 'Expected return date must be after the assignment date.' },
      { status: 400 }
    );
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const expectedReturnAtMidnight = new Date(body.expectedReturn);
  expectedReturnAtMidnight.setUTCHours(0, 0, 0, 0);

  if (expectedReturnAtMidnight < today) {
    return NextResponse.json(
      {
        error: `Expected return date must be today or in the future. You selected ${body.expectedReturn}, which is in the past.`,
      },
      { status: 400 }
    );
  }

  // ── Insert assignment ───────────────────────────────────────────────────
  const { data, error } = await supabase
    .from('assignments')
    .insert({
      asset_id:        asset.id,
      asset_tag:       asset.asset_tag,
      asset_name:      asset.name,
      category:        asset.category,
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

  // ── Mark asset as Assigned ──────────────────────────────────────────────
  const { error: assetUpdateErr } = await supabase
    .from('assets')
    .update({
      status:         'Assigned',
      assigned_to:    body.staffName,
      assigned_to_id: body.staffId,
      department:     body.department,
    })
    .eq('id', asset.id);

  if (assetUpdateErr) {
    // Roll back the assignment insert so we don't leave the system in a split state.
    await supabase.from('assignments').delete().eq('id', data.id);
    return NextResponse.json(
      { error: `Failed to update asset status: ${assetUpdateErr.message}` },
      { status: 500 }
    );
  }

  // ── Audit log ───────────────────────────────────────────────────────────
  await supabase.from('audit_logs').insert({
    action:       'Assigned',
    asset_tag:    asset.asset_tag,
    asset_name:   asset.name,
    performed_by: user.email ?? 'Admin (IT)',
    details:      `Assigned to ${body.staffName} (${body.staffId}) — ${body.department} — Return by ${body.expectedReturn}`,
  });

  return NextResponse.json(data, { status: 201 });
}
