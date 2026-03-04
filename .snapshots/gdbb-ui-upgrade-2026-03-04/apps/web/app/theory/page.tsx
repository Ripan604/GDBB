'use client';

import { useMemo, useState } from 'react';
import { BlockMath, InlineMath } from 'react-katex';

type TheoremSection = {
  id: string;
  title: string;
  formal: string;
  summary: string;
  intuition: string;
  example: string;
  references: string[];
  questions: string[];
  videos: Array<{ label: string; href: string }>;
};

const theoremSections: TheoremSection[] = [
  {
    id: 'theorem-1',
    title: 'Theorem 1 - Feasible Construction',
    formal: '\\forall t,\\ x_t \\in \\mathcal{X}_{feasible} \\Rightarrow UB_t < \\infty',
    summary: 'The greedy phase always returns a feasible initial solution if capacity/constraint checks are enforced at each insertion.',
    intuition: 'Greedy acts like a safety-first constructor. It may not be optimal, but it gives the solver a valid starting plan quickly.',
    example: 'In CVRP, customer insertion is only accepted when residual vehicle capacity remains non-negative.',
    references: ['Section 2.1', 'Algorithm 2 (Greedy Construction)'],
    questions: ['Why is a finite upper bound critical before starting B&B?', 'What happens to pruning if greedy returns no feasible incumbent?'],
    videos: [
      { label: 'Greedy Algorithms - MIT OCW', href: 'https://www.youtube.com/results?search_query=MIT+OCW+greedy+algorithm' },
      { label: 'Heuristic Construction for VRP', href: 'https://www.youtube.com/results?search_query=vehicle+routing+heuristic+construction' },
    ],
  },
  {
    id: 'theorem-2',
    title: 'Theorem 2 - Correctness',
    formal: 'LB(v) > UB^* \\Rightarrow \\text{prune}(v)',
    summary: 'GDBB remains exact for epsilon=0 because only branches provably worse than incumbent are discarded.',
    intuition: 'If a subtree cannot beat the best known solution, exploring it wastes time and cannot change the optimum.',
    example: 'If incumbent route cost is 220 and a node lower bound is 224, every descendant can be safely removed.',
    references: ['Section 3.2', 'Theorem 2'],
    questions: ['Why must lower bounds be admissible?', 'Can aggressive but non-admissible bounds break correctness?'],
    videos: [
      { label: 'Branch and Bound - MIT', href: 'https://www.youtube.com/results?search_query=MIT+branch+and+bound' },
      { label: 'Correctness Proof Style', href: 'https://www.youtube.com/results?search_query=algorithm+correctness+proof+branch+and+bound' },
    ],
  },
  {
    id: 'theorem-3',
    title: 'Theorem 3 - Time Complexity',
    formal: 'T(n)=O\\left(n^2 \\cdot 2^{n/\\log n}\\right)',
    summary: 'Hybrid decomposition plus Sigma-guided ordering reduces practical explosion compared with brute-force or pure B&B.',
    intuition: 'DP compresses repeated work; Sigma makes B&B focus only on promising regions.',
    example: 'On larger instances, B&B node count shrinks because DP bounds cut subtrees before full expansion.',
    references: ['Section 4.1', 'Theorem 3'],
    questions: ['What term reflects decomposition impact?', 'Why can practical runtime improve even if worst-case remains exponential?'],
    videos: [
      { label: 'Complexity of Exponential Search', href: 'https://www.youtube.com/results?search_query=exponential+time+complexity+branch+and+bound' },
      { label: 'Dynamic Programming Intro', href: 'https://www.youtube.com/results?search_query=dynamic+programming+introduction+Abdul+Bari' },
    ],
  },
  {
    id: 'theorem-4',
    title: 'Theorem 4 - Sigma Consistency',
    formal: '\\Sigma_{t+1}(k) \\leftarrow \\min\\{\\Sigma_t(k),\\ UB_k\\},\\ \\max\\{LB_k\\}',
    summary: 'Sigma updates preserve monotonic consistency: local upper bounds do not worsen and lower bounds do not loosen.',
    intuition: 'Sigma is the memory glue. It should become sharper over time, not noisier.',
    example: 'If route_3 has LB 45 and UB 51, later updates may become LB 46, UB 50 but never LB 40 or UB 60.',
    references: ['Section 4.3', 'Sigma Table Update Rule'],
    questions: ['Why does monotonic Sigma help phase coordination?', 'What bug appears if Sigma entries regress?'],
    videos: [
      { label: 'Memoization and State Tables', href: 'https://www.youtube.com/results?search_query=memoization+table+dynamic+programming' },
      { label: 'Bound Tightening Concepts', href: 'https://www.youtube.com/results?search_query=optimization+bound+tightening+explanation' },
    ],
  },
  {
    id: 'theorem-5',
    title: 'Theorem 5 - epsilon Approximation',
    formal: '\\frac{UB-LB}{UB} \\le \\epsilon',
    summary: 'The solver may terminate early with bounded optimality loss once relative gap is below epsilon.',
    intuition: 'Epsilon is a quality-speed dial: smaller values demand more proof, larger values prioritize latency.',
    example: 'UB=100, LB=98 gives 2% gap. With epsilon=0.03 stop is valid; with epsilon=0.01 search must continue.',
    references: ['Section 5.1', 'Theorem 5'],
    questions: ['How should epsilon change in real-time systems?', 'Why is relative gap better than absolute gap across scales?'],
    videos: [
      { label: 'Approximation Algorithms Overview', href: 'https://www.youtube.com/results?search_query=approximation+algorithms+stanford' },
      { label: 'Anytime Optimization Concepts', href: 'https://www.youtube.com/results?search_query=anytime+algorithm+optimization' },
    ],
  },
  {
    id: 'theorem-6',
    title: 'Theorem 6 - Convergence',
    formal: 'g(t)=g(0)e^{-\\lambda t}',
    summary: 'Gap convergence is modeled as exponential decay under sustained pruning and bound refinement.',
    intuition: 'Early steps often remove large uncertainty quickly; later steps provide diminishing but important refinements.',
    example: 'If g(0)=0.3 and \\lambda=0.5, expected gap around t=4 is 0.3e^{-2} \\approx 0.04.',
    references: ['Section 5.3', 'Theorem 6'],
    questions: ['How does pruning rate affect lambda?', 'Why do convergence curves flatten near optimum?'],
    videos: [
      { label: 'Exponential Decay Intuition', href: 'https://www.youtube.com/results?search_query=exponential+decay+visualization' },
      { label: 'Optimization Convergence Behavior', href: 'https://www.youtube.com/results?search_query=optimization+convergence+rate+tutorial' },
    ],
  },
];

function VideoLinks({ items }: { items: TheoremSection['videos'] }) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {items.map((video) => (
        <a
          key={video.href}
          href={video.href}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2 text-sm transition hover:border-[var(--surface-border-strong)]"
        >
          {video.label}
        </a>
      ))}
    </div>
  );
}

export default function TheoryPage() {
  const [epsilon, setEpsilon] = useState(0.02);
  const [lambda, setLambda] = useState(0.55);
  const [steps, setSteps] = useState(7);
  const [ub, setUb] = useState(100);
  const [lb, setLb] = useState(92);

  const labRows = useMemo(() => {
    const rows: Array<{ t: number; gap: number }> = [];
    const g0 = Math.max(0, (ub - lb) / Math.max(ub, 1e-6));
    for (let t = 0; t <= steps; t += 1) {
      rows.push({ t, gap: g0 * Math.exp(-lambda * t) });
    }
    return rows;
  }, [lambda, lb, steps, ub]);

  const currentGap = Math.max(0, (ub - lb) / Math.max(ub, 1e-6));
  const epsilonSatisfied = currentGap <= epsilon;

  return (
    <section className="space-y-8 pb-8">
      <header className="glass-panel-strong rounded-3xl p-6 md:p-8">
        <span className="eyebrow">Mathematical Foundations</span>
        <h1 className="section-title mt-3">Complete theorem workbook with intuition, references, and hands-on labs.</h1>
        <p className="section-subtitle mt-3">
          Each theorem includes formal statement, plain-language explanation, worked example, self-check questions, and linked learning videos.
        </p>
      </header>

      <section className="glass-panel rounded-3xl p-5">
        <h2 className="font-display text-2xl">Hands-On Lab: Epsilon and Convergence</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Move controls to observe approximation stopping and convergence behavior. This maps directly to{' '}
          <InlineMath math={'(UB-LB)/UB \\le \\epsilon'} /> and <InlineMath math={'g(t)=g(0)e^{-\\lambda t}'} />.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">UB</p>
            <input type="range" min={60} max={220} value={ub} className="mt-2 w-full" onChange={(event) => setUb(Number(event.target.value))} />
            <p className="text-sm">{ub.toFixed(1)}</p>
          </label>
          <label className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">LB</p>
            <input type="range" min={20} max={200} value={lb} className="mt-2 w-full" onChange={(event) => setLb(Number(event.target.value))} />
            <p className="text-sm">{lb.toFixed(1)}</p>
          </label>
          <label className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">epsilon</p>
            <input
              type="range"
              min={0.001}
              max={0.1}
              step={0.001}
              value={epsilon}
              className="mt-2 w-full"
              onChange={(event) => setEpsilon(Number(event.target.value))}
            />
            <p className="text-sm">{epsilon.toFixed(3)}</p>
          </label>
          <label className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">lambda</p>
            <input type="range" min={0.1} max={1.2} step={0.01} value={lambda} className="mt-2 w-full" onChange={(event) => setLambda(Number(event.target.value))} />
            <p className="text-sm">{lambda.toFixed(2)}</p>
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-[var(--surface-border)] bg-black/20 p-3">
          <p className="text-sm">
            Current relative gap: <span className="font-semibold">{(currentGap * 100).toFixed(2)}%</span> | Stop condition:{' '}
            <span className={epsilonSatisfied ? 'text-sigma' : 'text-bb'}>{epsilonSatisfied ? 'satisfied' : 'not satisfied'}</span>
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            {labRows.map((row) => (
              <div key={row.t} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] p-2">
                <p className="text-xs text-[var(--text-secondary)]">t={row.t}</p>
                <p className="text-sm font-semibold">{(row.gap * 100).toFixed(2)}%</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="space-y-5">
        {theoremSections.map((theorem) => (
          <article key={theorem.id} id={theorem.id} className="glass-panel rounded-3xl p-5 md:p-6">
            <h2 className="font-display text-2xl md:text-3xl">{theorem.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{theorem.summary}</p>

            <div className="mt-4 rounded-xl border border-[var(--surface-border)] bg-black/20 p-3">
              <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">Formal Statement</p>
              <BlockMath math={theorem.formal} />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3">
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">Intuition</p>
                <p className="text-sm leading-relaxed">{theorem.intuition}</p>
              </div>
              <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3">
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">Worked Example</p>
                <p className="text-sm leading-relaxed">{theorem.example}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3">
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">References</p>
                <ul className="space-y-1 text-sm">
                  {theorem.references.map((reference) => (
                    <li key={reference}>- {reference}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3">
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">Self-Check Questions</p>
                <ul className="space-y-1 text-sm">
                  {theorem.questions.map((question) => (
                    <li key={question}>- {question}</li>
                  ))}
                </ul>
              </div>
            </div>

            <VideoLinks items={theorem.videos} />
          </article>
        ))}
      </div>
    </section>
  );
}

