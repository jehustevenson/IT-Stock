// src/app/api/cron/validate-consistency/route.ts

import { validateDataConsistency } from '@/lib/data-consistency-utils';

export async function GET(request: Request) {
  // Verify the request is from Vercel
  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const result = await validateDataConsistency();
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}