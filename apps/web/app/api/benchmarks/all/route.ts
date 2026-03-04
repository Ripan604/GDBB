import { GDBB_STATS } from '@/lib/gdbb-stats';
import { getEngineBaseUrl } from '@/lib/server/env';

export const runtime = 'nodejs';

const fallbackLeaderboard = [
  { nickname: 'cosmic-greedy', gap: 0.0032, runtime_ms: 25210 },
  { nickname: 'dp-sigma', gap: 0.0041, runtime_ms: 28340 },
  { nickname: 'bound-hunter', gap: 0.0054, runtime_ms: 30124 },
];

export async function GET() {
  try {
    const res = await fetch(`${getEngineBaseUrl()}/benchmarks/all`, { cache: 'no-store' });
    if (res.ok) {
      return Response.json(await res.json());
    }
  } catch {
    // fallback below
  }

  return Response.json({ stats: GDBB_STATS, leaderboard: fallbackLeaderboard });
}

