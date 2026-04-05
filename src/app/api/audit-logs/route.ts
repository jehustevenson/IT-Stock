import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  // Check authorization - operator can read audit logs
  const authResult = await checkAuth('operator');
  if (authResult instanceof NextResponse) return authResult;

  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const assetTag = searchParams.get('assetTag');
  const performer = searchParams.get('performer');
  const search = searchParams.get('search');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 1000); // Max 1000
  const offset = parseInt(searchParams.get('offset') || '0');
  const startDate = searchParams.get('startDate'); // YYYY-MM-DD
  const endDate = searchParams.get('endDate'); // YYYY-MM-DD

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (action) {
    query = query.eq('action', action);
  }

  if (assetTag) {
    query = query.eq('asset_tag', assetTag);
  }

  if (performer) {
    query = query.ilike('performed_by', `%${performer}%`);
  }

  if (startDate) {
    query = query.gte('timestamp', `${startDate}T00:00:00`);
  }

  if (endDate) {
    query = query.lte('timestamp', `${endDate}T23:59:59`);
  }

  if (search) {
    // Search across multiple fields
    query = query.or(
      `asset_tag.ilike.%${search}%,asset_name.ilike.%${search}%,details.ilike.%${search}%,performed_by.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      offset,
      limit,
      total: count || 0,
      hasMore: (offset + limit) < (count || 0),
    },
  });
}