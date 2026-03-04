import { BlockMath, InlineMath } from 'react-katex';

const theorems = [
  {
    title: 'Theorem 2 - Correctness',
    statement: 'GDBB remains exact when epsilon equals zero and pruning only removes provably suboptimal branches.',
    math: 'LB(v) > UB^* \\Rightarrow \\text{prune}(v)',
    accent: 'from-neural to-dp',
  },
  {
    title: 'Theorem 3 - Time Complexity',
    statement: 'Hybrid decomposition and sigma-guided search reduce practical explosion compared with pure branch-and-bound.',
    math: 'T(n)=O(n^2 \\cdot 2^{n/\\log n})',
    accent: 'from-dp to-bb',
  },
  {
    title: 'Theorem 5 - epsilon Approximation',
    statement: 'Termination is guaranteed once the relative bound gap reaches epsilon.',
    math: '\\frac{UB-LB}{UB} \\le \\epsilon',
    accent: 'from-bb to-sigma',
  },
];

export default function TheoryPage() {
  return (
    <section className="space-y-8 pb-8">
      <header className="glass-panel-strong rounded-3xl p-6 md:p-8">
        <span className="eyebrow">Mathematical Foundations</span>
        <h1 className="section-title mt-3">Formal guarantees with clean, readable presentation.</h1>
        <p className="section-subtitle mt-3">
          The global background remains active while this page prioritizes theorem clarity, proof intuition, and
          readable equations.
        </p>
      </header>

      {theorems.map((t) => (
        <article key={t.title} className="glass-panel rounded-3xl p-4 md:p-5">
          <div className={`mb-4 h-1.5 rounded-full bg-gradient-to-r ${t.accent}`} />
          <h2 className="mb-2 font-display text-2xl md:text-3xl">{t.title}</h2>
          <p className="mb-3 text-sm leading-relaxed text-[var(--text-secondary)]">{t.statement}</p>
          <div className="surface-muted rounded-xl p-3">
            <BlockMath math={t.math} />
          </div>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Intuition: Greedy and DP provide informative bounds, then B&B narrows feasible regions until{' '}
            <InlineMath math={'g(t) \\to 0'} />.
          </p>
        </article>
      ))}
    </section>
  );
}

