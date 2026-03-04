export default function SchedulingDemoPage() {
  return (
    <section className="space-y-5 pb-8">
      <header className="space-y-4">
        <span className="eyebrow">Live Demo · MRORS</span>
        <h1 className="section-title">Operating Room Scheduling Simulator</h1>
      </header>
      <p className="section-subtitle">
        MVP uses deterministic contract-compatible streaming events. Real MRORS solver plugs in without API changes.
      </p>
      <div className="glass-panel rounded-2xl p-4 text-sm">
        Gantt timeline + 3D hospital scene scaffolded for phase-2 solver integration.
      </div>
    </section>
  );
}

