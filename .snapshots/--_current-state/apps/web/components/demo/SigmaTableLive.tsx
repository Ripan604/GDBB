import type { SigmaEntry } from '@gdbb/contracts';

export function SigmaTableLive({ entries }: { entries: SigmaEntry[] }) {
  return (
    <div className="glass-panel rounded-2xl p-3">
      <h3 className="mb-2 text-sm font-semibold text-sigma">Sigma Table Live</h3>
      <div className="max-h-48 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[var(--text-secondary)]">
              <th className="py-1">key</th>
              <th>LB</th>
              <th>UB</th>
              <th>conf</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.key} className="border-t border-white/10">
                <td className="py-1 font-mono">{e.key}</td>
                <td>{e.lb.toFixed(2)}</td>
                <td>{e.ub.toFixed(2)}</td>
                <td>{e.confidence.toFixed(2)}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-center text-[var(--text-secondary)]">
                  No sigma entries yet. Run the solver to populate this table.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

