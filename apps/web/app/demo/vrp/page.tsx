'use client';

import { useMemo, useState } from 'react';
import type { SigmaEntry, SolveEvent } from '@gdbb/contracts';
import { SigmaTableLive } from '@/components/demo/SigmaTableLive';
import { PhaseIndicator } from '@/components/demo/PhaseIndicator';
import { useSSE } from '@/lib/hooks/useSSE';

type DemoNode = { id: string; x: number; y: number; demand: number };
type BoundsState = { ub: number; lb: number; gap: number };
type PhaseState = 'GREEDY' | 'DP' | 'BB' | 'IDLE';
type RunInsights = {
  adaptiveEpsilon: number;
  targetEpsilon: number;
  decompositionRounds: number;
  repartitions: number;
  topBoundImpact: number;
  sigmaStoreLockFree: boolean;
};

const MAP_W = 680;
const MAP_H = 430;
const PAD_X = 70;
const PAD_Y = 46;
const SCALE_X = 9.2;
const SCALE_Y = 6.8;

const phaseColors: Record<Exclude<PhaseState, 'IDLE'>, string> = {
  GREEDY: '#3fd2ff',
  DP: '#7d8fff',
  BB: '#ff8f57',
};

const seedNodes: DemoNode[] = [
  { id: 'c1', x: 14, y: 22, demand: 6 },
  { id: 'c2', x: 30, y: 16, demand: 12 },
  { id: 'c3', x: 42, y: 33, demand: 8 },
  { id: 'c4', x: 26, y: 41, demand: 5 },
  { id: 'c5', x: 8, y: 36, demand: 10 },
  { id: 'c6', x: 35, y: 8, demand: 4 },
  { id: 'c7', x: 50, y: 23, demand: 9 },
  { id: 'c8', x: 19, y: 10, demand: 7 },
];

const depot = { x: 25, y: 25 };

function toScreen(node: { x: number; y: number }) {
  return {
    x: PAD_X + node.x * SCALE_X,
    y: MAP_H - PAD_Y - node.y * SCALE_Y,
  };
}

function formatEvent(event: SolveEvent) {
  if (event.type === 'phase_start') return `${event.phase} started`;
  if (event.type === 'phase_progress') return `${event.phase} ${Math.round(event.progress * 100)}%`;
  if (event.type === 'phase_complete') {
    if (event.phase === 'DP') {
      const focus = event.metrics.top_bound_impact;
      return focus ? `DP complete | top impact ${focus.toFixed(2)}` : 'DP complete';
    }
    if (event.phase === 'BB') {
      const active = event.metrics.adaptive_epsilon;
      const repartitions = event.metrics.repartitions;
      if (typeof active === 'number' && typeof repartitions === 'number') {
        return `BB complete | eps ${active.toFixed(3)} | repartitions ${Math.round(repartitions)}`;
      }
    }
    return `${event.phase} complete`;
  }
  if (event.type === 'node_pruned') return `Pruned ${event.node_id}`;
  if (event.type === 'sigma_snapshot') {
    const topImpact = event.entries[0]?.impact;
    return topImpact == null ? `Sigma snapshot (${event.entries.length})` : `Sigma snapshot (${event.entries.length}) | impact ${topImpact.toFixed(2)}`;
  }
  if (event.type === 'complete') return 'Solve complete';
  return event.error;
}

function asBounds(event: SolveEvent): BoundsState | null {
  if (event.type === 'phase_progress' || event.type === 'phase_complete' || event.type === 'node_pruned' || event.type === 'complete') {
    return event.bounds;
  }
  return null;
}

function parseRoutesFromSolution(
  events: SolveEvent[],
  nodes: DemoNode[],
  vehicles: number,
): { routes: string[][]; source: 'solver' | 'heuristic' } {
  const complete = [...events].reverse().find((event) => event.type === 'complete');
  if (complete?.type === 'complete') {
    const raw = complete.solution?.routes;
    if (Array.isArray(raw)) {
      const cleaned = raw
        .filter((route): route is string[] => Array.isArray(route))
        .map((route) => route.filter((id): id is string => typeof id === 'string' && id.length > 0));
      if (cleaned.length) return { routes: cleaned, source: 'solver' };
    }
  }

  const sorted = [...nodes].sort((a, b) => b.demand - a.demand);
  const heuristic = Array.from({ length: Math.max(1, vehicles) }, () => [] as string[]);
  sorted.forEach((node, idx) => {
    heuristic[idx % heuristic.length]?.push(node.id);
  });
  return { routes: heuristic, source: 'heuristic' };
}

function extractState(events: SolveEvent[]) {
  let phase: PhaseState = 'IDLE';
  let bounds: BoundsState = { ub: 0, lb: 0, gap: 0 };
  let sigma: SigmaEntry[] = [];
  let prunedCount = 0;
  let complete = false;
  let insights: RunInsights = {
    adaptiveEpsilon: 0,
    targetEpsilon: 0,
    decompositionRounds: 1,
    repartitions: 0,
    topBoundImpact: 0,
    sigmaStoreLockFree: false,
  };

  for (const event of events) {
    if (event.type === 'phase_start' || event.type === 'phase_progress' || event.type === 'phase_complete') {
      phase = event.phase;
    }
    const nextBounds = asBounds(event);
    if (nextBounds) bounds = nextBounds;
    if (event.type === 'node_pruned') prunedCount = event.pruned_count;
    if (event.type === 'sigma_snapshot') {
      sigma = event.entries;
      insights.topBoundImpact = event.entries[0]?.impact ?? insights.topBoundImpact;
    }
    if (event.type === 'phase_complete') {
      if (event.phase === 'DP') {
        insights.topBoundImpact = event.metrics.top_bound_impact ?? insights.topBoundImpact;
        insights.decompositionRounds = Math.max(insights.decompositionRounds, Math.round(event.metrics.decomposition_rounds ?? insights.decompositionRounds));
        insights.sigmaStoreLockFree = insights.sigmaStoreLockFree || (event.metrics.sigma_store_lock_free ?? 0) > 0.5;
      }
      if (event.phase === 'BB') {
        insights.adaptiveEpsilon = event.metrics.adaptive_epsilon ?? insights.adaptiveEpsilon;
        insights.targetEpsilon = event.metrics.target_epsilon ?? insights.targetEpsilon;
        insights.repartitions = Math.round(event.metrics.repartitions ?? insights.repartitions);
        insights.decompositionRounds = Math.max(insights.decompositionRounds, Math.round(event.metrics.decomposition_rounds ?? insights.decompositionRounds));
      }
    }
    if (event.type === 'complete') complete = true;
  }

  return { phase, bounds, sigma, prunedCount, complete, insights };
}

function buildRoutePath(ids: string[], nodesById: Map<string, DemoNode>) {
  const ordered = [{ id: 'depot', x: depot.x, y: depot.y }, ...ids.map((id) => nodesById.get(id)).filter(Boolean), { id: 'depot', x: depot.x, y: depot.y }] as Array<{
    id: string;
    x: number;
    y: number;
  }>;

  const points = ordered.map(toScreen);
  const path = points.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  let distance = 0;
  for (let i = 1; i < ordered.length; i += 1) {
    const a = ordered[i - 1];
    const b = ordered[i];
    if (!a || !b) continue;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    distance += Math.hypot(dx, dy);
  }

  return { path, distance };
}

function StatCard({
  label,
  value,
  tone,
  helper,
}: {
  label: string;
  value: string;
  tone?: string;
  helper?: string;
}) {
  return (
    <article className="metric-card">
      <p className="mb-1 text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">{label}</p>
      <p className={`font-display text-2xl ${tone ?? 'text-[var(--text-primary)]'}`}>{value}</p>
      {helper && <p className="mt-2 text-xs text-[var(--text-secondary)]">{helper}</p>}
    </article>
  );
}

function VrpOperationalMap({
  nodes,
  routes,
  activePhase,
  running,
  source,
  onAddNode,
}: {
  nodes: DemoNode[];
  routes: string[][];
  activePhase: PhaseState;
  running: boolean;
  source: 'solver' | 'heuristic';
  onAddNode: (x: number, y: number) => void;
}) {
  const nodesById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const depotScreen = toScreen(depot);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--bg-panel-strong)]">
      <div className="flex items-center justify-between border-b border-[var(--surface-border)] px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">Operational Network</p>
          <p className="text-sm text-[var(--text-secondary)]">Click map to add customers. Solver stream updates routes continuously.</p>
        </div>
        <div className="rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1 text-xs">
          Routes from: <span className="font-semibold text-[var(--text-primary)]">{source}</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        className="h-[430px] w-full cursor-crosshair"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const sx = ((event.clientX - rect.left) / Math.max(1, rect.width)) * MAP_W;
          const sy = ((event.clientY - rect.top) / Math.max(1, rect.height)) * MAP_H;
          const x = Math.max(2, Math.min(58, (sx - PAD_X) / SCALE_X));
          const y = Math.max(2, Math.min(58, (MAP_H - PAD_Y - sy) / SCALE_Y));
          onAddNode(x, y);
        }}
        aria-label="CVRP network map"
      >
        <defs>
          <linearGradient id="mapBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#091224" />
            <stop offset="100%" stopColor="#101f3d" />
          </linearGradient>
        </defs>
        <rect width={MAP_W} height={MAP_H} fill="url(#mapBg)" />

        {Array.from({ length: 15 }, (_, i) => (
          <line
            key={`grid-x-${i}`}
            x1={PAD_X + i * 38}
            y1={28}
            x2={PAD_X + i * 38}
            y2={MAP_H - 30}
            stroke="rgba(167, 187, 219, 0.11)"
          />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <line
            key={`grid-y-${i}`}
            x1={PAD_X}
            y1={38 + i * 43}
            x2={MAP_W - PAD_X + 10}
            y2={38 + i * 43}
            stroke="rgba(167, 187, 219, 0.11)"
          />
        ))}

        {activePhase === 'DP' && (
          <>
            <rect x="96" y="66" width="152" height="130" fill="rgba(125, 143, 255, 0.08)" stroke="rgba(125, 143, 255, 0.48)" />
            <rect x="260" y="88" width="168" height="126" fill="rgba(125, 143, 255, 0.08)" stroke="rgba(125, 143, 255, 0.48)" />
            <rect x="450" y="140" width="132" height="118" fill="rgba(125, 143, 255, 0.08)" stroke="rgba(125, 143, 255, 0.48)" />
          </>
        )}

        {routes.map((route, idx) => {
          const color = idx % 3 === 0 ? '#3fd2ff' : idx % 3 === 1 ? '#7d8fff' : '#ff8f57';
          const routeShape = buildRoutePath(route, nodesById);
          const duration = Math.max(5, Math.min(22, routeShape.distance * 0.18));
          return (
            <g key={`route-${idx}`}>
              <path d={routeShape.path} fill="none" stroke={color} strokeOpacity={0.66} strokeWidth={2.4} />
              <path d={routeShape.path} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={1.1} />
              {running && (
                <circle r={5.4} fill={color}>
                  <animateMotion dur={`${duration.toFixed(2)}s`} repeatCount="indefinite" rotate="auto" path={routeShape.path} />
                </circle>
              )}
            </g>
          );
        })}

        <circle cx={depotScreen.x} cy={depotScreen.y} r={11} fill="#ffd49e" />
        <circle
          cx={depotScreen.x}
          cy={depotScreen.y}
          r={24}
          fill="none"
          stroke={activePhase === 'IDLE' ? 'rgba(200,215,240,0.7)' : phaseColors[activePhase]}
          strokeWidth={2}
          strokeOpacity={0.82}
        />
        <text x={depotScreen.x + 14} y={depotScreen.y - 12} fill="#fff4df" fontSize={12}>
          depot
        </text>

        {nodes.map((node) => {
          const p = toScreen(node);
          const highDemand = node.demand > 8;
          return (
            <g key={node.id}>
              <circle cx={p.x} cy={p.y} r={10 + node.demand * 0.26} fill={highDemand ? 'rgba(255,143,87,0.2)' : 'rgba(63,210,255,0.2)'} />
              <circle cx={p.x} cy={p.y} r={4.8 + node.demand * 0.2} fill={highDemand ? '#ff9e70' : '#6edcff'} />
              <text x={p.x + 9} y={p.y - 8} fill="#d6e7ff" fontSize={11}>
                {node.id}
              </text>
            </g>
          );
        })}

        <text x={MAP_W - 188} y={38} fill="rgba(221,235,255,0.86)" fontSize={12}>
          Phase: {activePhase}
        </text>
      </svg>
    </div>
  );
}

export default function VrpDemoPage() {
  const [nodes, setNodes] = useState<DemoNode[]>(seedNodes);
  const [vehicles, setVehicles] = useState(4);
  const [capacity, setCapacity] = useState(28);
  const [epsilon, setEpsilon] = useState(0.02);
  const [alpha, setAlpha] = useState(1);
  const [beta, setBeta] = useState(1);
  const [gamma, setGamma] = useState(1);
  const [running, setRunning] = useState(false);

  const body = useMemo(
    () => ({
      problem_type: 'CVRP',
      nodes,
      vehicles,
      capacity,
      epsilon,
      alpha,
      beta,
      gamma,
      stream: true,
    }),
    [alpha, beta, capacity, epsilon, gamma, nodes, vehicles],
  );

  const { events, error, reset } = useSSE('/api/gdbb/solve', body, running);
  const state = useMemo(() => extractState(events), [events]);
  const routePlan = useMemo(() => parseRoutesFromSolution(events, nodes, vehicles), [events, nodes, vehicles]);
  const nodesById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  const routeDiagnostics = useMemo(() => {
    return routePlan.routes.map((route, idx) => {
      const demand = route.reduce((sum, id) => sum + (nodesById.get(id)?.demand ?? 0), 0);
      const loadPct = capacity > 0 ? Math.min(100, (demand / capacity) * 100) : 0;
      const { distance } = buildRoutePath(route, nodesById);
      return { idx, route, demand, loadPct, distance };
    });
  }, [capacity, nodesById, routePlan.routes]);

  const eventRows = useMemo(() => events.slice(-14).reverse(), [events]);
  const runningRuntime = useMemo(() => `${((events.length * 350) / 1000).toFixed(1)}s`, [events.length]);

  const addNode = (x: number, y: number) => {
    setNodes((prev) => {
      const id = `c${prev.length + 1}`;
      const demand = Math.max(1, Math.min(15, Math.round((x + y) % 13) + 2));
      return [...prev, { id, x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), demand }];
    });
  };

  return (
    <section className="space-y-8 pb-8">
      <header className="space-y-4">
        <span className="eyebrow">Live Demo - CVRP</span>
        <h1 className="section-title">Detailed CVRP operations center with streaming phase analytics.</h1>
        <p className="section-subtitle">
          This optimization assigns customer demands to vehicle routes with capacity constraints while minimizing total travel cost. Greedy builds a feasible plan, DP tightens
          bounds, and B&B proves or improves quality under epsilon stop conditions.
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr] xl:items-start">
        <div className="space-y-4">
          <VrpOperationalMap nodes={nodes} routes={routePlan.routes} activePhase={state.phase} running={running} source={routePlan.source} onAddNode={addNode} />
          <PhaseIndicator phase={state.phase} />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Upper Bound (UB)" value={state.bounds.ub.toFixed(2)} tone="text-neural" helper="Current best feasible objective." />
            <StatCard label="Lower Bound (LB)" value={state.bounds.lb.toFixed(2)} tone="text-dp" helper="Provable floor from DP/B&B." />
            <StatCard label="Relative Gap" value={`${(state.bounds.gap * 100).toFixed(2)}%`} tone="text-bb" helper="Termination metric: (UB-LB)/UB." />
            <StatCard label="Nodes Pruned" value={String(state.prunedCount)} tone="text-sigma" helper="B&B states removed using bounds." />
            <StatCard
              label="Adaptive epsilon"
              value={(state.insights.adaptiveEpsilon || epsilon).toFixed(3)}
              tone="text-dp"
              helper={`Tightens automatically toward target ${((state.insights.targetEpsilon || epsilon)).toFixed(3)}.`}
            />
            <StatCard
              label="Decomposition rounds"
              value={String(state.insights.decompositionRounds)}
              tone="text-sigma"
              helper={`Dynamic repartitions triggered: ${state.insights.repartitions}`}
            />
          </div>

          <div className="glass-panel rounded-2xl p-4">
            <h2 className="mb-3 font-display text-xl">Route Diagnostics</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {routeDiagnostics.map((route) => (
                <article key={`diag-${route.idx}`} className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">Vehicle {route.idx + 1}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{route.route.length} stops</p>
                  </div>
                  <p className="text-sm">Route: {route.route.length ? route.route.join(' -> ') : 'idle'}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">Demand load: {route.demand.toFixed(1)} / {capacity}</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/20">
                    <div className="h-full bg-gradient-to-r from-neural to-sigma" style={{ width: `${route.loadPct}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">Distance proxy: {route.distance.toFixed(1)}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4">
            <h2 className="mb-3 font-display text-xl">Live Event Timeline</h2>
            <div className="max-h-56 overflow-auto rounded-xl border border-[var(--surface-border)] bg-black/20 p-2">
              {eventRows.length === 0 ? (
                <p className="p-2 text-sm text-[var(--text-secondary)]">Run the solver to stream phase events.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[var(--text-secondary)]">
                      <th className="py-1">event</th>
                      <th>detail</th>
                      <th>gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventRows.map((event, idx) => {
                      const bounds = asBounds(event);
                      return (
                        <tr key={`${event.type}-${idx}`} className="border-t border-[var(--surface-border)]">
                          <td className="py-1 font-mono">{event.type}</td>
                          <td>{formatEvent(event)}</td>
                          <td>{bounds ? `${(bounds.gap * 100).toFixed(2)}%` : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-28">
          <section className="glass-panel rounded-2xl p-4">
            <h2 className="mb-4 font-display text-2xl">Solver Controls</h2>

            <label className="mb-3 block">
              <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                <span>Vehicles</span>
                <span>{vehicles}</span>
              </div>
              <input className="w-full" type="range" min={1} max={10} value={vehicles} onChange={(event) => setVehicles(Number(event.target.value))} />
            </label>

            <label className="mb-3 block">
              <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                <span>Capacity</span>
                <span>{capacity}</span>
              </div>
              <input className="w-full" type="range" min={10} max={60} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} />
            </label>

            <label className="mb-3 block">
              <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                <span>Target epsilon</span>
                <span>{epsilon.toFixed(3)}</span>
              </div>
              <input
                className="w-full"
                type="range"
                min={0.001}
                max={0.08}
                step={0.001}
                value={epsilon}
                onChange={(event) => setEpsilon(Number(event.target.value))}
              />
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button
                className="primary-btn px-3 py-2 text-xs"
                onClick={() => {
                  reset();
                  setRunning(true);
                }}
              >
                Run
              </button>
              <button className="ghost-btn px-3 py-2 text-xs" onClick={() => setRunning(false)}>
                Pause
              </button>
              <button
                className="ghost-btn px-3 py-2 text-xs"
                onClick={() => {
                  setRunning(false);
                  reset();
                }}
              >
                Reset
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <label className="rounded-lg border border-[var(--surface-border)] p-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">alpha</p>
                <input className="mt-1 w-full" type="range" min={0.5} max={2.5} step={0.1} value={alpha} onChange={(event) => setAlpha(Number(event.target.value))} />
              </label>
              <label className="rounded-lg border border-[var(--surface-border)] p-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">beta</p>
                <input className="mt-1 w-full" type="range" min={0.5} max={2.5} step={0.1} value={beta} onChange={(event) => setBeta(Number(event.target.value))} />
              </label>
              <label className="rounded-lg border border-[var(--surface-border)] p-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">gamma</p>
                <input className="mt-1 w-full" type="range" min={0.5} max={2.5} step={0.1} value={gamma} onChange={(event) => setGamma(Number(event.target.value))} />
              </label>
            </div>
          </section>

          <SigmaTableLive entries={state.sigma} />

          <section className="glass-panel rounded-2xl p-4 text-sm">
            <h3 className="mb-2 font-display text-xl">Current Hybrid Strategy</h3>
            <ul className="space-y-2 text-[var(--text-secondary)]">
              <li>
                <span className="font-semibold text-[var(--text-primary)]">DP priority:</span> subproblems are ordered by BoundImpact, currently peaking at{' '}
                {state.insights.topBoundImpact.toFixed(2)}.
              </li>
              <li>
                <span className="font-semibold text-[var(--text-primary)]">Dynamic decomposition:</span> the solver can repartition stalled search regions. Current rounds:{' '}
                {state.insights.decompositionRounds} with {state.insights.repartitions} refresh events.
              </li>
              <li>
                <span className="font-semibold text-[var(--text-primary)]">Sigma store:</span> {state.insights.sigmaStoreLockFree ? 'lock-free snapshot mode is active' : 'snapshot mode pending'} with
                optimistic copy-on-write updates instead of a global request lock.
              </li>
            </ul>
          </section>

          <section className="glass-panel rounded-2xl p-4 text-sm">
            <h3 className="mb-2 font-display text-xl">What This Demo Is Showing</h3>
            <ul className="space-y-2 text-[var(--text-secondary)]">
              <li>
                <span className="font-semibold text-[var(--text-primary)]">Vehicles:</span> number of available trucks. More vehicles can reduce route length but may lower utilization.
              </li>
              <li>
                <span className="font-semibold text-[var(--text-primary)]">Capacity:</span> max load per truck. Capacity violations force route splitting and increase cost.
              </li>
              <li>
                <span className="font-semibold text-[var(--text-primary)]">Target epsilon:</span> desired final tolerance. The live run starts looser for fast progress, then tightens as Sigma fills in.
              </li>
              <li>
                <span className="font-semibold text-[var(--text-primary)]">Dynamic decomposition:</span> if pruning slows down, the remaining search is repartitioned to refresh DP bounds.
              </li>
              <li>
                <span className="font-semibold text-[var(--text-primary)]">Sigma Table:</span> impact-ranked subproblem bounds drive DP order and B&B pruning priority.
              </li>
            </ul>
            <p className="mt-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] p-2 text-xs text-[var(--text-secondary)]">
              Runtime: {runningRuntime} | Status: {state.complete ? 'complete' : running ? 'streaming' : 'paused'} | Nodes: {nodes.length}
            </p>
            <div className="mt-3 flex gap-2">
              <button className="ghost-btn flex-1 px-3 py-2 text-xs" onClick={() => setNodes(seedNodes)}>
                Reset Nodes
              </button>
              <button className="ghost-btn flex-1 px-3 py-2 text-xs" onClick={() => setNodes((prev) => prev.slice(0, Math.max(1, prev.length - 1)))}>
                Remove Last
              </button>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
