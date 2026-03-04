import { NextRequest } from 'next/server';
import { getQueue } from '@/lib/server/queue';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const queue = getQueue();
  if (!queue) {
    return Response.json({ error: 'REDIS_URL not configured' }, { status: 501 });
  }

  const body = await req.json();
  const domain = String(body.problem_type ?? '').toLowerCase();
  if (!domain) {
    return Response.json({ error: 'problem_type required' }, { status: 400 });
  }

  const job = await queue.add(domain, body, {
    removeOnComplete: 100,
    removeOnFail: 100,
  });

  return Response.json({ queued: true, job_id: job.id });
}

