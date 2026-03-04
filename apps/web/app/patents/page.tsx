'use client';

import { useMemo, useState } from 'react';

type Claim = {
  id: string;
  title: string;
  scope: 'core' | 'method' | 'system' | 'application';
  summary: string;
  risk: number;
};

const claims: Claim[] = [
  {
    id: 'C1',
    title: 'Unified Hybrid Optimization Loop',
    scope: 'core',
    summary: 'Covers orchestration of Greedy, DP, and B&B with shared Sigma memory and bound feedback.',
    risk: 12,
  },
  {
    id: 'C2',
    title: 'Sigma-Table Guided Branching',
    scope: 'method',
    summary: 'Claims variable/node selection strategy informed by dynamic Sigma confidence scores.',
    risk: 19,
  },
  {
    id: 'C3',
    title: 'Streaming Optimization Telemetry API',
    scope: 'system',
    summary: 'Claims real-time phase/bound/sigma event protocol for interactive optimization systems.',
    risk: 27,
  },
  {
    id: 'C4',
    title: 'Cross-domain Contract Normalization',
    scope: 'application',
    summary: 'Claims GCOP-style interface enabling CVRP, scheduling, portfolio, and routing under one solver API.',
    risk: 15,
  },
];

const scopeColor: Record<Claim['scope'], string> = {
  core: '#3fd2ff',
  method: '#7d8fff',
  system: '#ff8f57',
  application: '#4ce4b1',
};

export default function PatentsPage() {
  const [activeScope, setActiveScope] = useState<Claim['scope'] | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return claims.filter((claim) => {
      const scopeOk = activeScope === 'all' || claim.scope === activeScope;
      const textOk = !q || `${claim.title} ${claim.summary}`.toLowerCase().includes(q);
      return scopeOk && textOk;
    });
  }, [activeScope, search]);

  const noveltyScore = useMemo(() => {
    if (!filtered.length) return 0;
    const meanRisk = filtered.reduce((sum, claim) => sum + claim.risk, 0) / filtered.length;
    return Math.max(0, 100 - meanRisk);
  }, [filtered]);

  return (
    <section className="space-y-6 pb-8">
      <header className="glass-panel-strong rounded-3xl p-6">
        <span className="eyebrow">Patent Layer</span>
        <h1 className="section-title mt-3">Claims explorer with scope filtering and novelty risk scoring.</h1>
        <p className="section-subtitle mt-3">
          Track what is protected, where overlap risk exists, and how claims map to algorithmic and system-level innovations.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="glass-panel rounded-2xl p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search claims..."
              className="input-shell w-full rounded-xl px-3 py-2 text-sm outline-none lg:w-64"
            />
            {(['all', 'core', 'method', 'system', 'application'] as const).map((scope) => (
              <button
                key={scope}
                className={`chip-btn rounded-full px-3 py-1 text-xs uppercase tracking-[0.12em] ${
                  activeScope === scope ? 'ring-1 ring-[var(--surface-border-strong)]' : ''
                }`}
                onClick={() => setActiveScope(scope)}
              >
                {scope}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.map((claim) => (
              <article key={claim.id} className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">{claim.id}</p>
                    <h2 className="font-display text-xl">{claim.title}</h2>
                  </div>
                  <span className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ background: `${scopeColor[claim.scope]}22`, color: scopeColor[claim.scope] }}>
                    {claim.scope}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{claim.summary}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/20">
                  <div className="h-full" style={{ width: `${claim.risk}%`, backgroundColor: '#ff8f57' }} />
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Overlap risk: {claim.risk}%</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="glass-panel rounded-2xl p-4">
            <h2 className="font-display text-2xl">Novelty Meter</h2>
            <p className="mt-2 font-display text-4xl text-sigma">{noveltyScore.toFixed(1)}%</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/20">
              <div className="h-full bg-gradient-to-r from-bb via-dp to-sigma" style={{ width: `${noveltyScore}%` }} />
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">Higher score means lower overlap risk in current filtered claim view.</p>
          </section>

          <section className="glass-panel rounded-2xl p-4">
            <h3 className="font-display text-xl">Coverage Map</h3>
            <ul className="mt-2 space-y-2 text-sm text-[var(--text-secondary)]">
              <li>- Core claims protect hybrid architecture and correctness-safe pruning.</li>
              <li>- Method claims protect Sigma-driven branching and decomposition routines.</li>
              <li>- System claims protect streaming telemetry and interactive solver UX integration.</li>
              <li>- Application claims protect multi-domain solver contract reuse.</li>
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
}

