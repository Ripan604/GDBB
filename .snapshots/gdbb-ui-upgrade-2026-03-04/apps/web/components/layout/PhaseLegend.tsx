export function PhaseLegend() {
  return (
    <aside className="glass-panel fixed bottom-4 left-4 z-40 hidden rounded-2xl p-3 text-[11px] tracking-wide md:block">
      <p className="mb-2 font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Phase Palette</p>
      <p className="mb-1.5 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-neural" />
        GREEDY
      </p>
      <p className="mb-1.5 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-dp" />
        DYNAMIC PROG
      </p>
      <p className="mb-1.5 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-bb" />
        BRANCH & BOUND
      </p>
      <p className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-sigma" />
        SIGMA TABLE
      </p>
    </aside>
  );
}

