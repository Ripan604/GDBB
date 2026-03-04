export function PhaseIndicator({ phase }: { phase: 'GREEDY' | 'DP' | 'BB' | 'IDLE' }) {
  return (
    <div className="glass-panel flex gap-2 rounded-xl p-2 text-xs">
      {['GREEDY', 'DP', 'BB'].map((p) => (
        <span
          key={p}
          className={`rounded-full px-3 py-1.5 font-mono ${
            phase === p
              ? p === 'GREEDY'
                ? 'bg-neural/25 text-neural'
                : p === 'DP'
                  ? 'bg-dp/25 text-dp'
                  : 'bg-bb/25 text-bb'
              : 'bg-white/10 text-[var(--text-secondary)]'
          }`}
        >
          {p}
        </span>
      ))}
    </div>
  );
}

