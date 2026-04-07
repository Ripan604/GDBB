'use client';

import { useEffect, useMemo, useState } from 'react';
import { BlockMath, InlineMath } from 'react-katex';

const pseudoLines = [
  'Sigma <- init_lock_free()',
  'S <- GreedyConstruct(alpha, beta, gamma)',
  'UB <- cost(S)',
  'epsilon_active <- widen(epsilon_target)',
  'LB <- DPTighten(priority=BoundImpact, k, Sigma)',
  'while (UB-LB)/UB > epsilon_active:',
  '  if pruning_stalls(): ReDecompose(frontier, k); RefreshDPBounds(Sigma)',
  '  node <- SelectNodeBySigma()',
  '  Branch(node); PruneByBounds()',
  '  epsilon_active <- tighten(epsilon_target, memoized_states, |Sigma|)',
  '  Update(UB, LB, Sigma)',
  'return S*',
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function ExplorePage() {
  const [alpha, setAlpha] = useState(1.1);
  const [beta, setBeta] = useState(1.0);
  const [gamma, setGamma] = useState(0.9);
  const [epsilon, setEpsilon] = useState(0.02);
  const [k, setK] = useState(6);
  const [playing, setPlaying] = useState(false);
  const [line, setLine] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setLine((value) => {
        if (value >= pseudoLines.length - 1) {
          setPlaying(false);
          return value;
        }
        return value + 1;
      });
    }, 750);
    return () => window.clearInterval(timer);
  }, [playing]);

  const complexityEstimate = useMemo(() => {
    const weighted = (alpha + beta + gamma) / 3;
    const decompositionGain = Math.log(Math.max(2, k)) / Math.log(10);
    const epsilonPenalty = 1 + (0.04 - epsilon) * 4;
    return clamp(weighted * epsilonPenalty / Math.max(0.3, decompositionGain), 0.1, 4.8);
  }, [alpha, beta, epsilon, gamma, k]);

  const phaseProgress = useMemo(() => {
    const greedy = clamp((alpha + beta + gamma) / 3 / 2, 0.1, 1);
    const dp = clamp(k / 12, 0.1, 1);
    const bb = clamp((0.06 - epsilon) / 0.06, 0.08, 1);
    return { greedy, dp, bb };
  }, [alpha, beta, epsilon, gamma, k]);

  const adaptiveEpsilon = useMemo(() => {
    const start = Math.min(0.08, epsilon + 0.022 - k * 0.0006);
    const tightened = start - (k / 12) * 0.012 - gamma * 0.002;
    return clamp(tightened, epsilon, 0.08);
  }, [epsilon, gamma, k]);

  const redecompositionPressure = useMemo(() => {
    const stall = complexityEstimate / 4.8;
    const tightness = clamp((0.04 - epsilon) / 0.04, 0, 1);
    return clamp(stall * 0.55 + tightness * 0.45, 0.05, 0.98);
  }, [complexityEstimate, epsilon]);

  const impactPriority = useMemo(() => clamp((beta * 0.34 + gamma * 0.28 + k / 12 * 0.38) / 1.6, 0.08, 0.99), [beta, gamma, k]);

  const complexityLabel = complexityEstimate < 1.2 ? 'fast' : complexityEstimate < 2.8 ? 'balanced' : 'heavy-search';

  return (
    <section className="space-y-8 pb-8">
      <header className="glass-panel-strong rounded-3xl p-6 md:p-8">
        <span className="eyebrow">Algorithm Explorer</span>
        <h1 className="section-title mt-3">Interactive phase laboratory for Greedy, DP, and Sigma-guided B&B.</h1>
        <p className="section-subtitle mt-3">
          Tune parameters and watch adaptive epsilon, impact-prioritized DP, re-decomposition pressure, and phase load react in real-time.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section className="glass-panel rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl">Pseudocode Playback</h2>
            <div className="flex gap-2">
              <button
                className="primary-btn px-3 py-2 text-xs"
                onClick={() => {
                  setLine(0);
                  setPlaying(true);
                }}
              >
                Play
              </button>
              <button className="ghost-btn px-3 py-2 text-xs" onClick={() => setPlaying(false)}>
                Pause
              </button>
              <button
                className="ghost-btn px-3 py-2 text-xs"
                onClick={() => {
                  setPlaying(false);
                  setLine(0);
                }}
              >
                Reset
              </button>
            </div>
          </div>
          <pre className="max-h-[380px] overflow-auto rounded-xl border border-[var(--surface-border)] bg-black/25 p-3 font-mono text-xs leading-7">
            {pseudoLines.map((entry, idx) => (
              <div
                key={entry}
                className={`rounded px-2 ${
                  idx === line
                    ? 'bg-gradient-to-r from-neural/35 to-dp/20 text-[var(--text-primary)]'
                    : idx < line
                      ? 'text-slate-200'
                      : 'text-slate-400'
                }`}
              >
                <span className="mr-3 text-slate-500">{String(idx + 1).padStart(2, '0')}</span>
                {entry}
              </div>
            ))}
          </pre>
          <p className="mt-3 text-xs text-[var(--text-secondary)]">
            Current line: {line + 1} / {pseudoLines.length} | mode: {playing ? 'running' : 'idle'}
          </p>
        </section>

        <aside className="space-y-4">
          <section className="glass-panel rounded-2xl p-4">
            <h3 className="font-display text-xl">Parameter Console</h3>
            <div className="mt-3 space-y-3">
              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  <span>alpha</span>
                  <span>{alpha.toFixed(2)}</span>
                </div>
                <input className="w-full" type="range" min={0.5} max={2} step={0.05} value={alpha} onChange={(event) => setAlpha(Number(event.target.value))} />
              </label>
              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  <span>beta</span>
                  <span>{beta.toFixed(2)}</span>
                </div>
                <input className="w-full" type="range" min={0.5} max={2} step={0.05} value={beta} onChange={(event) => setBeta(Number(event.target.value))} />
              </label>
              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  <span>gamma</span>
                  <span>{gamma.toFixed(2)}</span>
                </div>
                <input className="w-full" type="range" min={0.5} max={2} step={0.05} value={gamma} onChange={(event) => setGamma(Number(event.target.value))} />
              </label>
              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  <span>target epsilon</span>
                  <span>{epsilon.toFixed(3)}</span>
                </div>
                <input className="w-full" type="range" min={0.001} max={0.06} step={0.001} value={epsilon} onChange={(event) => setEpsilon(Number(event.target.value))} />
              </label>
              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  <span>k decomposition</span>
                  <span>{k}</span>
                </div>
                <input className="w-full" type="range" min={2} max={12} step={1} value={k} onChange={(event) => setK(Number(event.target.value))} />
              </label>
            </div>
          </section>

          <section className="glass-panel rounded-2xl p-4">
            <h3 className="font-display text-xl">Complexity Meter</h3>
            <div className="mt-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">Estimated search pressure</p>
              <p className="font-display text-3xl">{complexityEstimate.toFixed(2)}x</p>
              <p className="text-xs text-[var(--text-secondary)]">profile: {complexityLabel}</p>
            </div>
            <div className="mt-3 rounded-xl border border-[var(--surface-border)] bg-black/20 p-3">
              <BlockMath math={'T(n) = O(n^2 \\cdot 2^{n/\\log n})'} />
              <p className="text-xs text-[var(--text-secondary)]">
                Adaptive stop check tightens toward <InlineMath math={'(UB-LB)/UB \\le \\epsilon_{target}'} />
              </p>
            </div>
          </section>
        </aside>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="glass-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">Greedy Load</p>
          <p className="mt-1 font-display text-2xl text-neural">{Math.round(phaseProgress.greedy * 100)}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/20">
            <div className="h-full bg-neural" style={{ width: `${phaseProgress.greedy * 100}%` }} />
          </div>
        </article>
        <article className="glass-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">DP Tightening</p>
          <p className="mt-1 font-display text-2xl text-dp">{Math.round(phaseProgress.dp * 100)}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/20">
            <div className="h-full bg-dp" style={{ width: `${phaseProgress.dp * 100}%` }} />
          </div>
        </article>
        <article className="glass-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">B&B Intensity</p>
          <p className="mt-1 font-display text-2xl text-bb">{Math.round(phaseProgress.bb * 100)}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/20">
            <div className="h-full bg-bb" style={{ width: `${phaseProgress.bb * 100}%` }} />
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="glass-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">Adaptive epsilon</p>
          <p className="mt-1 font-display text-2xl text-dp">{adaptiveEpsilon.toFixed(3)}</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Starts looser for fast progress, then narrows toward your target epsilon.</p>
        </article>
        <article className="glass-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">BoundImpact focus</p>
          <p className="mt-1 font-display text-2xl text-sigma">{Math.round(impactPriority * 100)}%</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Higher values prioritize DP work on variables likely to improve pruning downstream.</p>
        </article>
        <article className="glass-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">Re-decomposition pressure</p>
          <p className="mt-1 font-display text-2xl text-bb">{Math.round(redecompositionPressure * 100)}%</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Represents how likely the solver is to refresh subproblems when pruning stalls.</p>
        </article>
      </section>
    </section>
  );
}
