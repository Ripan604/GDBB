'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SigmaEntry, SolveEvent } from '@gdbb/contracts';
import { SigmaTableLive } from '@/components/demo/SigmaTableLive';
import { PhaseIndicator } from '@/components/demo/PhaseIndicator';
import { useSSE } from '@/lib/hooks/useSSE';

type DemoNode = { id: string; x: number; y: number; demand: number };

const seedNodes: DemoNode[] = [
  { id: 'c1', x: 14, y: 22, demand: 6 },
  { id: 'c2', x: 30, y: 16, demand: 12 },
  { id: 'c3', x: 42, y: 33, demand: 8 },
  { id: 'c4', x: 26, y: 41, demand: 5 },
  { id: 'c5', x: 8, y: 36, demand: 10 },
  { id: 'c6', x: 35, y: 8, demand: 4 },
  { id: 'c7', x: 50, y: 23, demand: 9 },
];

const depot = { x: 25, y: 25 };

function extractState(events: SolveEvent[]) {
  let phase: 'GREEDY' | 'DP' | 'BB' | 'IDLE' = 'IDLE';
  let ub = 0;
  let lb = 0;
  let gap = 0;
  let sigma: SigmaEntry[] = [];
  let prunedCount = 0;
  let complete = false;

  for (const e of events) {
    if (e.type === 'phase_start' || e.type === 'phase_progress' || e.type === 'phase_complete') {
      phase = e.phase;
    }
    if (e.type === 'phase_progress' || e.type === 'phase_complete' || e.type === 'node_pruned') {
      ub = e.bounds.ub;
      lb = e.bounds.lb;
      gap = e.bounds.gap;
    }
    if (e.type === 'node_pruned') {
      prunedCount = e.pruned_count;
    }
    if (e.type === 'sigma_snapshot') {
      sigma = e.entries;
    }
    if (e.type === 'complete') {
      ub = e.bounds.ub;
      lb = e.bounds.lb;
      gap = e.bounds.gap;
      complete = true;
    }
  }

  return { phase, ub, lb, gap, sigma, prunedCount, complete };
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <article className="metric-card">
      <p className="mb-1 text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">{label}</p>
      <p className={`font-display text-2xl ${tone ?? 'text-[var(--text-primary)]'}`}>{value}</p>
    </article>
  );
}

function VrpNetworkMap({ nodes, activePhase }: { nodes: DemoNode[]; activePhase: 'GREEDY' | 'DP' | 'BB' | 'IDLE' }) {
  const phaseColor =
    activePhase === 'GREEDY'
      ? '#00d4ff'
      : activePhase === 'DP'
        ? '#7b2fbe'
        : activePhase === 'BB'
          ? '#ff6b35'
          : '#8ba2c6';

  return (
    <div className="surface-muted rounded-2xl p-3">
      <svg viewBox="0 0 560 360" className="h-[360px] w-full rounded-xl">
        <defs>
          <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#7b2fbe" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ff6b35" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="560" height="360" fill="rgba(9,14,30,0.55)" />

        {nodes.map((node, index) => {
          const x = 60 + node.x * 9;
          const y = 320 - node.y * 6;
          const depotX = 60 + depot.x * 9;
          const depotY = 320 - depot.y * 6;
          const curvature = index % 2 === 0 ? -18 : 18;
          return (
            <path
              key={`route-${node.id}`}
              d={`M ${depotX} ${depotY} Q ${(depotX + x) / 2} ${(depotY + y) / 2 + curvature} ${x} ${y}`}
              stroke="url(#routeGrad)"
              strokeWidth="1.6"
              strokeOpacity="0.5"
              fill="none"
            />
          );
        })}

        <circle cx={60 + depot.x * 9} cy={320 - depot.y * 6} r="11" fill="#ffd08f" />
        <circle cx={60 + depot.x * 9} cy={320 - depot.y * 6} r="20" fill="none" stroke={phaseColor} strokeWidth="1.5" strokeOpacity="0.8" />

        {nodes.map((node) => {
          const x = 60 + node.x * 9;
          const y = 320 - node.y * 6;
          const radius = 4 + node.demand * 0.45;
          const highDemand = node.demand > 8;
          return (
            <g key={node.id}>
              <circle cx={x} cy={y} r={radius + 4} fill={highDemand ? 'rgba(255,107,53,0.18)' : 'rgba(0,212,255,0.14)'} />
              <circle cx={x} cy={y} r={radius} fill={highDemand ? '#ff8f5f' : '#70dcff'} />
              <text x={x + 8} y={y - 8} fill="rgba(216,230,250,0.85)" fontSize="11">
                {node.id}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function VrpDemoPage() {
  const [vehicles, setVehicles] = useState(3);
  const [capacity, setCapacity] = useState(20);
  const [epsilon, setEpsilon] = useState(0.01);
  const [running, setRunning] = useState(false);

  const body = useMemo(
    () => ({
      problem_type: 'CVRP',
      nodes: seedNodes,
      vehicles,
      capacity,
      epsilon,
      alpha: 1,
      beta: 1,
      gamma: 1,
      stream: true,
    }),
    [vehicles, capacity, epsilon],
  );

  const { events, error, reset } = useSSE('/api/gdbb/solve', body, running);
  const state = useMemo(() => extractState(events), [events]);

  useEffect(() => {
    setRunning(true);
    return () => setRunning(false);
  }, []);

  return (
    <section className="space-y-8 pb-8">
      <header className="space-y-4">
        <span className="eyebrow">Live Demo - CVRP</span>
        <h1 className="section-title">Run GDBB on a streaming vehicle routing instance.</h1>
        <p className="section-subtitle">
          This demo focuses on phase telemetry and bound convergence while the global background handles immersive motion.
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr] xl:items-start">
        <div className="space-y-4">
          <VrpNetworkMap nodes={seedNodes} activePhase={state.phase} />
          <PhaseIndicator phase={state.phase} />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Upper Bound" value={state.ub.toFixed(2)} tone="text-neural" />
            <StatCard label="Lower Bound" value={state.lb.toFixed(2)} tone="text-dp" />
            <StatCard label="Gap" value={`${(state.gap * 100).toFixed(2)}%`} tone="text-bb" />
            <StatCard label="Nodes Pruned" value={String(state.prunedCount)} tone="text-sigma" />
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-28">
          <section className="glass-panel rounded-2xl p-4">
            <h2 className="mb-4 font-display text-2xl">Solver Controls</h2>

            <label className="mb-3 block">
              <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                <span>Vehicles</span>
                <span>{vehicles}</span>
              </div>
              <input
                className="w-full"
                type="range"
                min={1}
                max={8}
                value={vehicles}
                onChange={(e) => setVehicles(Number(e.target.value))}
              />
            </label>

            <label className="mb-3 block">
              <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                <span>Capacity</span>
                <span>{capacity}</span>
              </div>
              <input
                className="w-full"
                type="range"
                min={10}
                max={40}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </label>

            <label className="mb-4 block">
              <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                <span>Epsilon</span>
                <span>{epsilon.toFixed(3)}</span>
              </div>
              <input
                className="w-full"
                type="range"
                min={0.001}
                max={0.05}
                step={0.001}
                value={epsilon}
                onChange={(e) => setEpsilon(Number(e.target.value))}
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
          </section>

          <SigmaTableLive entries={state.sigma} />
        </aside>
      </div>
    </section>
  );
}

