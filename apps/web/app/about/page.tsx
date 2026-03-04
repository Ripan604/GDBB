const pillars = [
  {
    title: 'Research Goal',
    body: 'Unify greedy construction, dynamic programming, and branch-and-bound into one production-usable optimization framework.',
  },
  {
    title: 'Engineering Goal',
    body: 'Make solver internals visible through live telemetry, phase animation, Sigma snapshots, and cross-domain demos.',
  },
  {
    title: 'Product Goal',
    body: 'Deliver an educational and technical platform where users can understand why optimization works, not just consume final numbers.',
  },
];

const stackRows = [
  ['Frontend', 'Next.js 14, TypeScript, Tailwind, R3F, D3, Zustand'],
  ['Backend', 'FastAPI solver engine + Next API proxy + BullMQ worker'],
  ['Data', 'Supabase Postgres, Redis cache, Qdrant vector retrieval'],
  ['AI', 'OpenAI/Anthropic/Ollama provider chain with citation-aware retrieval'],
  ['Ops', 'Vercel + Railway deployment, Sentry observability, CI pipelines'],
];

const roadmap = [
  'MVP: full CVRP stream, theorem workbook, benchmark suite, chat assistant.',
  'Phase 2: real scheduling/portfolio/routing solvers replacing mocks.',
  'Phase 3: PDF-fidelity paper ingestion and validated benchmark replay pipeline.',
  'Phase 4: collaborative runs, authenticated workspaces, and reproducibility packs.',
];

export default function AboutPage() {
  return (
    <section className="space-y-6 pb-8">
      <header className="glass-panel-strong rounded-3xl p-6 md:p-8">
        <span className="eyebrow">About</span>
        <h1 className="section-title mt-3">Research mission, technical architecture, and delivery roadmap.</h1>
        <p className="section-subtitle mt-3">
          GDBB is positioned as a bridge between formal optimization theory and practical decision systems across logistics, operations, finance, and networks.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {pillars.map((pillar) => (
          <article key={pillar.title} className="glass-panel rounded-2xl p-4">
            <h2 className="font-display text-2xl">{pillar.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{pillar.body}</p>
          </article>
        ))}
      </div>

      <section className="glass-panel rounded-2xl p-4">
        <h2 className="mb-3 font-display text-2xl">System Architecture</h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--surface-border)]">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-[var(--surface-muted)]">
              <tr className="text-left text-[var(--text-secondary)]">
                <th className="px-3 py-2">Layer</th>
                <th className="px-3 py-2">Implementation</th>
              </tr>
            </thead>
            <tbody>
              {stackRows.map(([layer, implementation]) => (
                <tr key={layer} className="border-t border-[var(--surface-border)]">
                  <td className="px-3 py-2 font-semibold">{layer}</td>
                  <td className="px-3 py-2">{implementation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-4">
        <h2 className="mb-3 font-display text-2xl">Roadmap and Delivery Status</h2>
        <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
          {roadmap.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      </section>

      <section className="glass-panel rounded-2xl p-4">
        <h2 className="mb-3 font-display text-2xl">Acknowledgements</h2>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          This platform combines optimization research, visual interaction design, and ML-assisted explanation workflows. Add team names, affiliations, and paper submission details
          here for final release.
        </p>
      </section>
    </section>
  );
}

