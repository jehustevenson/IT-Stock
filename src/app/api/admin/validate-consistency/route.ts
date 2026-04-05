// src/app/api/admin/validate-consistency/route.ts

import { validateDataConsistency } from '@/lib/data-consistency-utils';
import { checkAuth } from '@/lib/auth-utils';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Only admins can run consistency checks
  const authResult = await checkAuth('admin');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const result = await validateDataConsistency();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}