'use client';

import { useMemo, useState } from 'react';

type CityNode = { id: string; name: string; x: number; y: number };
type Link = { a: string; b: string; utilization: number };

const nodes: CityNode[] = [
  { id: 'LON', name: 'London', x: 120, y: 120 },
  { id: 'PAR', name: 'Paris', x: 210, y: 180 },
  { id: 'AMS', name: 'Amsterdam', x: 190, y: 118 },
  { id: 'FRA', name: 'Frankfurt', x: 290, y: 172 },
  { id: 'MAD', name: 'Madrid', x: 120, y: 290 },
  { id: 'MIL', name: 'Milan', x: 300, y: 248 },
  { id: 'VIE', name: 'Vienna', x: 390, y: 190 },
  { id: 'WAR', name: 'Warsaw', x: 430, y: 126 },
];

const baseLinks: Link[] = [
  { a: 'LON', b: 'AMS', utilization: 42 },
  { a: 'LON', b: 'PAR', utilization: 57 },
  { a: 'PAR', b: 'FRA', utilization: 70 },
  { a: 'PAR', b: 'MAD', utilization: 48 },
  { a: 'AMS', b: 'FRA', utilization: 63 },
  { a: 'FRA', b: 'VIE', utilization: 68 },
  { a: 'VIE', b: 'WAR', utilization: 52 },
  { a: 'FRA', b: 'MIL', utilization: 66 },
  { a: 'MAD', b: 'MIL', utilization: 38 },
];

function linkColor(utilization: number) {
  if (utilization >= 80) return '#ff8f57';
  if (utilization >= 50) return '#f6d365';
  return '#4ce4b1';
}

export default function RoutingDemoPage() {
  const [flowCount, setFlowCount] = useState(4);
  const [latencyBudget, setLatencyBudget] = useState(35);
  const [lossBudget, setLossBudget] = useState(1.2);

  const links = useMemo(() => {
    const flowPressure = flowCount * 4;
    const latencyPressure = Math.max(0, 45 - latencyBudget) * 0.9;
    const lossPressure = Math.max(0, 2.5 - lossBudget) * 3.5;
    const extra = flowPressure + latencyPressure + lossPressure;
    return baseLinks.map((link, idx) => ({
      ...link,
      utilization: Math.min(100, Math.max(8, link.utilization + extra * (0.45 + (idx % 4) * 0.12))),
    }));
  }, [flowCount, latencyBudget, lossBudget]);

  const feasibility = useMemo(() => {
    const overloaded = links.filter((link) => link.utilization > 90).length;
    return Math.max(0, 100 - overloaded * 14 - flowCount * 2 + latencyBudget * 0.2);
  }, [flowCount, latencyBudget, links]);

  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), []);

  return (
    <section className="space-y-6 pb-8">
      <header className="glass-panel-strong rounded-3xl p-6">
        <span className="eyebrow">Live Demo - QoSNR</span>
        <h1 className="section-title mt-3">Backbone routing constellation with QoS constraints.</h1>
        <p className="section-subtitle mt-3">
          Explore how flow volume and QoS budgets affect link congestion and feasible path allocation.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="glass-panel rounded-2xl p-4">
          <h2 className="mb-3 font-display text-2xl">Network Constellation</h2>
          <svg viewBox="0 0 620 360" className="h-[360px] w-full rounded-xl border border-[var(--surface-border)] bg-black/25">
            {links.map((link) => {
              const a = byId.get(link.a);
              const b = byId.get(link.b);
              if (!a || !b) return null;
              const color = linkColor(link.utilization);
              return (
                <g key={`${link.a}-${link.b}`}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={2.8} strokeOpacity={0.85} />
                  <text x={(a.x + b.x) / 2 + 5} y={(a.y + b.y) / 2 - 6} fill="#d2e4ff" fontSize={10}>
                    {link.utilization.toFixed(0)}%
                  </text>
                </g>
              );
            })}
            {nodes.map((node) => (
              <g key={node.id}>
                <circle cx={node.x} cy={node.y} r={7} fill="#e8f3ff" />
                <circle cx={node.x} cy={node.y} r={14} fill="none" stroke="#9bc1ee" strokeOpacity={0.45} />
                <text x={node.x + 9} y={node.y - 9} fill="#e0efff" fontSize={11}>
                  {node.name}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <aside className="space-y-4">
          <section className="glass-panel rounded-2xl p-4">
            <h2 className="font-display text-2xl">QoS Controls</h2>
            <div className="mt-3 space-y-3">
              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  <span>Flow count</span>
                  <span>{flowCount}</span>
                </div>
                <input className="w-full" type="range" min={1} max={12} value={flowCount} onChange={(event) => setFlowCount(Number(event.target.value))} />
              </label>
              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  <span>Latency budget (ms)</span>
                  <span>{latencyBudget}</span>
                </div>
                <input
                  className="w-full"
                  type="range"
                  min={15}
                  max={60}
                  value={latencyBudget}
                  onChange={(event) => setLatencyBudget(Number(event.target.value))}
                />
              </label>
              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  <span>Loss budget (%)</span>
                  <span>{lossBudget.toFixed(1)}</span>
                </div>
                <input
                  className="w-full"
                  type="range"
                  min={0.3}
                  max={3.2}
                  step={0.1}
                  value={lossBudget}
                  onChange={(event) => setLossBudget(Number(event.target.value))}
                />
              </label>
            </div>
          </section>

          <section className="glass-panel rounded-2xl p-4">
            <h3 className="font-display text-xl">Feasibility</h3>
            <p className="mt-2 font-display text-4xl text-sigma">{feasibility.toFixed(1)}%</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/20">
              <div className="h-full bg-gradient-to-r from-bb via-dp to-sigma" style={{ width: `${feasibility}%` }} />
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Higher flow pressure and tighter budgets increase congested links and reduce feasible routing options.
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}

