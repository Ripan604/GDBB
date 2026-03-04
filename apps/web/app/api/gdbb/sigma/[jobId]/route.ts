import { getEngineBaseUrl } from '@/lib/server/env';

export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: { jobId: string } }) {
  const res = await fetch(`${getEngineBaseUrl()}/sigma/snapshot/${params.jobId}`);
  if (!res.ok) {
    return Response.json({ error: 'Failed to fetch sigma snapshot' }, { status: 502 });
  }

  return Response.json(await res.json());
}
