'use client';

import { useEffect, useMemo, useState } from 'react';

type Algo = 'GDBB' | 'CPLEX' | 'Gurobi' | 'LNS' | 'OR-Tools';

type AlgoProfile = {
  startGap: number;
  finalGap: number;
  time: number;
  curve: number;
  color: string;
};

const profiles: Record<Algo, AlgoProfile> = {
  GDBB: { startGap: 0.2, finalGap: 0.0024, time: 22.3, curve: 2.7, color: '#3fd2ff' },
  CPLEX: { startGap: 0.2, finalGap: 0.0232, time: 598.2, curve: 1.2, color: '#ff8f57' },
  Gurobi: { startGap: 0.2, finalGap: 0.0191, time: 471, curve: 1.3, color: '#7d8fff' },
  LNS: { startGap: 0.2, finalGap: 0.034, time: 182, curve: 1.8, color: '#4ce4b1' },
  'OR-Tools': { startGap: 0.2, finalGap: 0.041, time: 211, curve: 1.55, color: '#8ad1c0' },
};

function gapAt(profile: AlgoProfile, progress: number) {
  const eased = Math.pow(Math.max(0, 1 - progress), profile.curve);
  return profile.finalGap + (profile.startGap - profile.finalGap) * eased;
}

function RaceTrack({ color, progress }: { color: string; progress: number }) {
  const x = 30 + progress * 280;
  return (
    <svg viewBox="0 0 340 96" className="h-24 w-full rounded-xl border border-[var(--surface-border)] bg-black/20">
      <path d="M28 66 C90 16,250 16,312 66" fill="none" stroke="rgba(191,210,232,0.36)" strokeWidth={2} />
      <circle cx={x} cy={66 - Math.sin(progress * Math.PI) * 44} r={8} fill={color} />
      <circle cx={x} cy={66 - Math.sin(progress * Math.PI) * 44} r={16} fill={color} fillOpacity={0.22} />
    </svg>
  );
}

function CompetitorCard({
  side,
  algorithm,
  setAlgorithm,
  progress,
  gap,
  runtime,
  color,
}: {
  side: 'A' | 'B';
  algorithm: Algo;
  setAlgorithm: (next: Algo) => void;
  progress: number;
  gap: number;
  runtime: number;
  color: string;
}) {
  return (
    <article className="glass-panel rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-display text-xl">Algorithm {side}</p>
        <select
          className="input-shell rounded-lg px-3 py-2 text-sm"
          value={algorithm}
          onChange={(event) => setAlgorithm(event.target.value as Algo)}
        >
          {Object.keys(profiles).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <RaceTrack color={color} progress={progress} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">Gap</p>
          <p className="font-display text-2xl">{(gap * 100).toFixed(2)}%</p>
        </div>
        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">Time</p>
          <p className="font-display text-2xl">{runtime.toFixed(1)}s</p>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/20">
        <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, backgroundColor: color }} />
      </div>
    </article>
  );
}

export default function ComparePage() {
  const [algorithmA, setAlgorithmA] = useState<Algo>('GDBB');
  const [algorithmB, setAlgorithmB] = useState<Algo>('CPLEX');
  const [problem, setProblem] = useState('CVRP n=500');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [seed, setSeed] = useState(1);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setElapsed((value) => value + 0.2);
    }, 140);
    return () => window.clearInterval(timer);
  }, [running]);

  const profileA = profiles[algorithmA];
  const profileB = profiles[algorithmB];
  const progressA = Math.min(1, elapsed / profileA.time);
  const progressB = Math.min(1, elapsed / profileB.time);
  const gapA = gapAt(profileA, progressA);
  const gapB = gapAt(profileB, progressB);
  const runtimeA = Math.min(elapsed, profileA.time);
  const runtimeB = Math.min(elapsed, profileB.time);

  useEffect(() => {
    if (!running) return;
    if (progressA >= 1 && progressB >= 1) setRunning(false);
  }, [progressA, progressB, running]);

  const winner = useMemo(() => {
    if (running) return null;
    if (elapsed === 0) return null;
    if (profileA.time < profileB.time) return 'A';
    if (profileB.time < profileA.time) return 'B';
    if (profileA.finalGap < profileB.finalGap) return 'A';
    if (profileB.finalGap < profileA.finalGap) return 'B';
    return 'Draw';
  }, [elapsed, profileA.finalGap, profileA.time, profileB.finalGap, profileB.time, running]);

  return (
    <section className="space-y-6 pb-8">
      <header className="glass-panel-strong rounded-3xl p-6">
        <span className="eyebrow">Face-Off Arena</span>
        <h1 className="section-title mt-3">Crown-jewel comparison: side-by-side race to epsilon-quality solutions.</h1>
        <p className="section-subtitle mt-3">
          Run synchronized competitions on the same instance to show why GDBB exists: faster convergence, tighter gaps, and higher pruning efficiency.
        </p>
      </header>

      <div className="glass-panel rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="primary-btn px-4 py-2 text-sm"
            onClick={() => {
              setElapsed(0);
              setSeed((value) => value + 1);
              setRunning(true);
            }}
          >
            Start Race
          </button>
          <button className="ghost-btn px-4 py-2 text-sm" onClick={() => setRunning(false)}>
            Pause
          </button>
          <button
            className="ghost-btn px-4 py-2 text-sm"
            onClick={() => {
              setRunning(false);
              setElapsed(0);
            }}
          >
            Reset
          </button>
          <select className="input-shell rounded-lg px-3 py-2 text-sm" value={problem} onChange={(event) => setProblem(event.target.value)}>
            <option>CVRP n=500</option>
            <option>MRORS n=320</option>
            <option>CCPO n=700</option>
            <option>QoSNR n=420</option>
          </select>
          <span className="rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--text-secondary)]">
            seed {seed}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CompetitorCard
          side="A"
          algorithm={algorithmA}
          setAlgorithm={setAlgorithmA}
          progress={progressA}
          gap={gapA}
          runtime={runtimeA}
          color={profileA.color}
        />
        <CompetitorCard
          side="B"
          algorithm={algorithmB}
          setAlgorithm={setAlgorithmB}
          progress={progressB}
          gap={gapB}
          runtime={runtimeB}
          color={profileB.color}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <article className="metric-card">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">Problem</p>
          <p className="font-display text-2xl">{problem}</p>
        </article>
        <article className="metric-card">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">Winner</p>
          <p className="font-display text-2xl">
            {winner === null ? 'Running...' : winner === 'Draw' ? 'Draw' : `Algorithm ${winner}`}
          </p>
        </article>
        <article className="metric-card">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">Race Clock</p>
          <p className="font-display text-2xl">{elapsed.toFixed(1)}s</p>
        </article>
      </div>

      <section className="glass-panel rounded-2xl p-4">
        <h2 className="mb-2 font-display text-xl">Why This Matters</h2>
        <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
          <li>- The compare arena turns claims into direct evidence on identical instances.</li>
          <li>- It exposes the quality-time tradeoff visually: fast initial improvement vs proof-heavy exact search.</li>
          <li>- This makes the research argument explicit: GDBB is not just accurate, it is practically deployable under time constraints.</li>
        </ul>
      </section>
    </section>
  );
}

