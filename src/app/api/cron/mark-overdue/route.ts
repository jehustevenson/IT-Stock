// src/app/api/cron/mark-overdue/route.ts

import { markOverdueAssignments } from '@/app/actions/overdue';

export async function GET(request: Request) {
  // Guard: ensure CRON_SECRET is configured
  if (!process.env.CRON_SECRET) {
    console.error('CRON_SECRET is not set');
    return new Response('Server misconfiguration', { status: 500 });
  }

  // Guard: verify the request is authorized
  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const result = await markOverdueAssignments();
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}