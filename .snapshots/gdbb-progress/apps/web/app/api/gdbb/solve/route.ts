import { NextRequest } from 'next/server';
import { ProblemTypeSchema } from '@gdbb/contracts';
import { getEngineBaseUrl } from '@/lib/server/env';
import { getCachedSse, keyForSolvePayload, setCachedSse } from '@/lib/server/solve-cache';
import { createMockSolveStream } from '@/lib/server/mock-solve';

export const runtime = 'nodejs';

const endpointByProblem: Record<string, string> = {
  CVRP: '/solve/cvrp',
  SCHEDULING: '/solve/scheduling',
  PORTFOLIO: '/solve/portfolio',
  ROUTING: '/solve/routing',
};

function sseHeaders() {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = ProblemTypeSchema.safeParse(body.problem_type);

  if (!parsed.success) {
    return Response.json({ error: 'Invalid problem_type' }, { status: 400 });
  }

  const endpoint = endpointByProblem[parsed.data];
  const cacheKey = keyForSolvePayload(body);
  const cached = getCachedSse(cacheKey);
  if (cached) {
    return new Response(cached, { status: 200, headers: sseHeaders() });
  }

  try {
    const upstream = await fetch(`${getEngineBaseUrl()}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (upstream.ok && upstream.body) {
      const [toClient, toCache] = upstream.body.tee();
      void (async () => {
        try {
          const text = await new Response(toCache).text();
          setCachedSse(cacheKey, text);
        } catch {
          // no-op
        }
      })();

      return new Response(toClient, {
        status: 200,
        headers: sseHeaders(),
      });
    }
  } catch {
    // engine unavailable; fallback stream below
  }

  const fallbackStream = createMockSolveStream(parsed.data, Number(body.epsilon ?? 0.01));
  return new Response(fallbackStream, {
    status: 200,
    headers: {
      ...sseHeaders(),
      'x-gdbb-fallback': 'mock-stream',
    },
  });
}

