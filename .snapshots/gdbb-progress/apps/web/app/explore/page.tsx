import { BlockMath } from 'react-katex';

const pseudo = `Algorithm 1: GDBB(instance, epsilon)
1: S <- GreedyConstruct(instance, alpha, beta, gamma)
2: sigma <- InitSigma(S)
3: LB <- DPTighten(instance, sigma)
4: while gap(UB(S), LB) > epsilon do
5:   node <- SelectNodeBB(sigma)
6:   Branch(node)
7:   PruneByBounds(sigma)
8: return BestSolution()`;

const controls = [
  { name: 'alpha', value: '1.0', note: 'construction weight' },
  { name: 'beta', value: '1.0', note: 'demand pressure' },
  { name: 'gamma', value: '1.0', note: 'route balance' },
  { name: 'epsilon', value: '0.01', note: 'termination gap' },
];

const phases = [
  {
    title: 'Greedy Construction',
    color: 'bg-neural',
    summary: 'Builds a fast feasible incumbent to initialize UB and route structure.',
  },
  {
    title: 'Dynamic Programming Tightening',
    color: 'bg-dp',
    summary: 'Refines decomposition bounds and writes subproblem confidence into Sigma.',
  },
  {
    title: 'Branch-and-Bound Guided Search',
    color: 'bg-bb',
    summary: 'Explores unresolved nodes and prunes aggressively using Sigma-informed bounds.',
  },
];

export default function ExplorePage() {
  return (
    <section className="space-y-8 pb-8">
      <header className="glass-panel-strong rounded-3xl p-6 md:p-8">
        <span className="eyebrow">Algorithm Explorer</span>
        <h1 className="section-title mt-3">Understand GDBB phase-by-phase without boxed 3D widgets.</h1>
        <p className="section-subtitle mt-3">
          Background animation remains persistent across the site. This page focuses on control logic, complexity,
          and parameter semantics.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-3">
        {phases.map((phase) => (
          <article key={phase.title} className="glass-panel rounded-2xl p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${phase.color}`} />
              <h2 className="font-display text-xl">{phase.title}</h2>
            </div>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{phase.summary}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr] xl:items-start">
        <section className="glass-panel rounded-2xl p-4">
          <h3 className="mb-2 font-display text-2xl">Main Loop Pseudocode</h3>
          <pre className="surface-muted max-h-[340px] overflow-auto rounded-xl p-3 font-mono text-xs text-[var(--text-primary)]">
            {pseudo}
          </pre>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-28">
          <section className="glass-panel rounded-2xl p-4">
            <h3 className="mb-3 font-display text-xl">Complexity Model</h3>
            <BlockMath math={'T(n) = O(n^2 \\cdot 2^{n/\\log n})'} />
            <BlockMath math={'S(n) = O(n^2\\log n)'} />
          </section>

          <section className="glass-panel rounded-2xl p-4">
            <h3 className="mb-3 font-display text-xl">Active Parameters</h3>
            <div className="space-y-2">
              {controls.map((control) => (
                <div key={control.name} className="surface-muted rounded-xl px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                      {control.name}
                    </p>
                    <p className="font-mono text-sm text-[var(--text-primary)]">{control.value}</p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{control.note}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

