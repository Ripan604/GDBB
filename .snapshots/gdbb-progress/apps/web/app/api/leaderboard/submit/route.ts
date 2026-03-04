import { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

const entries: Array<{ nickname: string; gap: number; runtime_ms: number; at: string }> = [];

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const { allowed } = rateLimit(ip, 5, 60_000);
  if (!allowed) {
    return Response.json({ error: 'rate_limited' }, { status: 429 });
  }

  const body = await req.json();
  const nickname = String(body.nickname ?? 'anon').slice(0, 30);
  const gap = Number(body.gap);
  const runtime_ms = Number(body.runtime_ms);

  if (!Number.isFinite(gap) || !Number.isFinite(runtime_ms)) {
    return Response.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const at = new Date().toISOString();
  entries.push({ nickname, gap, runtime_ms, at });
  entries.sort((a, b) => a.gap - b.gap || a.runtime_ms - b.runtime_ms);
  const rank = entries.findIndex(
    (entry) =>
      entry.nickname === nickname &&
      entry.gap === gap &&
      entry.runtime_ms === runtime_ms &&
      entry.at === at,
  );

  return Response.json({ ok: true, rank: rank + 1, total: entries.length });
}

export async function GET() {
  return Response.json({ entries: entries.slice(0, 50) });
}


