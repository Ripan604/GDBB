export default function ComparePage() {
  return (
    <section className="space-y-5 pb-8">
      <header className="space-y-4">
        <span className="eyebrow">Face-Off Arena</span>
        <h1 className="section-title">Run synchronized races between GDBB and baseline solvers.</h1>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel rounded-2xl p-4">
          <h2 className="font-display text-xl">Algorithm A: GDBB</h2>
          <p className="text-sm text-[var(--text-secondary)]">Live SSE stream placeholder with progress meter.</p>
          <p className="mt-2">Gap: 0.24% | Time: 22.3s</p>
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <h2 className="font-display text-xl">Algorithm B: Baseline</h2>
          <p className="text-sm text-[var(--text-secondary)]">Parallel stream container for race visualization.</p>
          <p className="mt-2">Gap: 2.32% | Time: 598.2s</p>
        </div>
      </div>
    </section>
  );
}

