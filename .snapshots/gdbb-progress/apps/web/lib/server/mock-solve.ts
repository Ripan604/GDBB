import type { ProblemType, SolveEvent } from '@gdbb/contracts';

function nowIso() {
  return new Date().toISOString();
}

function eventBase(jobId: string, domain: ProblemType) {
  return {
    job_id: jobId,
    ts: nowIso(),
    domain,
  };
}

function toSseLine(event: SolveEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockSolveStream(domain: ProblemType, epsilon = 0.01): ReadableStream {
  const jobId = `mock-${Math.random().toString(36).slice(2, 10)}`;
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        let ub = 860;
        let lb = 700;
        let pruned = 0;

        const phaseOrder: Array<'GREEDY' | 'DP' | 'BB'> = ['GREEDY', 'DP', 'BB'];

        for (const phase of phaseOrder) {
          controller.enqueue(
            encoder.encode(
              toSseLine({
                ...eventBase(jobId, domain),
                type: 'phase_start',
                phase,
                message: `${phase} phase started (${domain})`,
              }),
            ),
          );
          await delay(120);

          for (const progress of [0.2, 0.45, 0.7, 1]) {
            ub *= phase === 'GREEDY' ? 0.994 : phase === 'DP' ? 0.996 : 0.997;
            lb = Math.min(ub * (1 - epsilon * 0.45), lb + (ub - lb) * (phase === 'GREEDY' ? 0.14 : 0.25));
            if (phase === 'BB') pruned += 18;

            const bounds = { ub, lb, gap: Math.max(0, (ub - lb) / ub) };

            controller.enqueue(
              encoder.encode(
                toSseLine({
                  ...eventBase(jobId, domain),
                  type: phase === 'BB' ? 'node_pruned' : 'phase_progress',
                  phase,
                  ...(phase === 'BB'
                    ? { node_id: `n-${pruned}`, pruned_count: pruned, bounds }
                    : { progress, bounds }),
                } as SolveEvent),
              ),
            );

            if (phase === 'DP' && progress > 0.8) {
              controller.enqueue(
                encoder.encode(
                  toSseLine({
                    ...eventBase(jobId, domain),
                    type: 'sigma_snapshot',
                    entries: [
                      { key: 'region_0', lb: lb * 0.32, ub: ub * 0.35, confidence: 0.91 },
                      { key: 'region_1', lb: lb * 0.28, ub: ub * 0.31, confidence: 0.87 },
                      { key: 'region_2', lb: lb * 0.24, ub: ub * 0.27, confidence: 0.9 },
                    ],
                  }),
                ),
              );
            }

            await delay(95);
          }

          controller.enqueue(
            encoder.encode(
              toSseLine({
                ...eventBase(jobId, domain),
                type: 'phase_complete',
                phase,
                bounds: { ub, lb, gap: Math.max(0, (ub - lb) / ub) },
                metrics: { mock_mode: 1, pruned_nodes: pruned },
              }),
            ),
          );

          await delay(110);
        }

        controller.enqueue(
          encoder.encode(
            toSseLine({
              ...eventBase(jobId, domain),
              type: 'complete',
              bounds: { ub, lb, gap: Math.max(0, (ub - lb) / ub) },
              runtime_ms: 18340,
              solution: {
                mode: 'web-fallback-mock',
                domain,
              },
            }),
          ),
        );
      } finally {
        controller.close();
      }
    },
  });
}