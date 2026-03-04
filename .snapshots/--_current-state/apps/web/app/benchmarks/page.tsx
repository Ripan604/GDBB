'use client';

import { useEffect, useState } from 'react';
import { RadarChart, ScalingChart, AblationBars, HeatmapTable } from '@/components/benchmarks/Charts';

export default function BenchmarksPage() {
  const [rows, setRows] = useState<Array<{ nickname: string; gap: number; runtime_ms: number }>>([]);

  useEffect(() => {
    let active = true;
    const fetchLeaderboard = async () => {
      const res = await fetch('/api/benchmarks/all');
      const json = await res.json();
      if (active) setRows(json.leaderboard ?? []);
    };
    fetchLeaderboard();
    const i = window.setInterval(fetchLeaderboard, 30_000);
    return () => {
      active = false;
      window.clearInterval(i);
    };
  }, []);

  return (
    <section className="space-y-6 pb-8">
      <header className="space-y-4">
        <span className="eyebrow">Benchmark Terminal</span>
        <h1 className="section-title">Experimental performance across all benchmark classes.</h1>
      </header>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="glass-panel rounded-2xl p-4">
          <h2 className="mb-3 font-display text-xl">Optimality Gap Radar</h2>
          <RadarChart
            data={[
              { label: 'CVRP-s', value: 96 },
              { label: 'CVRP-l', value: 88 },
              { label: 'MRORS', value: 92 },
              { label: 'CCPO', value: 90 },
              { label: 'QoSNR', value: 87 },
            ]}
          />
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <h2 className="mb-3 font-display text-xl">Computation Scaling</h2>
          <ScalingChart />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="glass-panel rounded-2xl p-4">
          <h2 className="mb-3 font-display text-xl">Ablation Study</h2>
          <AblationBars />
        </div>
        <div className="glass-panel rounded-2xl p-4 xl:col-span-2">
          <h2 className="mb-3 font-display text-xl">Significance Heatmap</h2>
          <HeatmapTable />
        </div>
      </div>
      <div className="glass-panel-strong rounded-2xl p-4">
        <h2 className="mb-2 font-display text-xl">Live Leaderboard</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--text-secondary)]">
              <th>Nickname</th>
              <th>Gap</th>
              <th>Runtime (ms)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.nickname}-${i}`} className="border-t border-white/10">
                <td className="py-1">{r.nickname}</td>
                <td>{(r.gap * 100).toFixed(2)}%</td>
                <td>{r.runtime_ms}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

