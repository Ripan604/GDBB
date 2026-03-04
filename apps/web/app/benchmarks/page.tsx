'use client';

import { useEffect, useMemo, useState } from 'react';
import { GDBB_STATS } from '@/lib/gdbb-stats';
import {
  AblationGroupedBars,
  HeatmapTable,
  LeaderboardRuntimeStrip,
  PruningFlow,
  RadarChart,
  ScalingChart,
} from '@/components/benchmarks/Charts';

type LeaderboardRow = { nickname: string; gap: number; runtime_ms: number };

export default function BenchmarksPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    let active = true;
    const fetchLeaderboard = async () => {
      const response = await fetch('/api/benchmarks/all');
      const json = await response.json();
      if (active) setRows(json.leaderboard ?? []);
    };
    void fetchLeaderboard();
    const timer = window.setInterval(fetchLeaderboard, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const radarData = useMemo(
    () => [
      { label: 'CVRP-small', gdbb: 97, cplex: 93, gurobi: 92 },
      { label: 'CVRP-large', gdbb: 89, cplex: 63, gurobi: 71 },
      { label: 'MRORS', gdbb: 94, cplex: 81, gurobi: 83 },
      { label: 'CCPO', gdbb: 91, cplex: 73, gurobi: 77 },
      { label: 'QoSNR', gdbb: 88, cplex: 69, gurobi: 75 },
    ],
    [],
  );

  const scalingData = useMemo(
    () => [
      { n: 50, gdbb: 2.8, cplex: 8.2, gurobi: 6.1 },
      { n: 100, gdbb: 4.9, cplex: 16.4, gurobi: 12.2 },
      { n: 250, gdbb: 9.4, cplex: 58.8, gurobi: 42.7 },
      { n: 500, gdbb: 22.3, cplex: 598.2, gurobi: 471.0 },
      { n: 1000, gdbb: 64.1, cplex: 1902, gurobi: 1325 },
      { n: 5000, gdbb: 488, cplex: 12000, gurobi: 7900 },
      { n: 10000, gdbb: 1430, cplex: 20000, gurobi: 14800 },
    ],
    [],
  );

  const ablationRows = useMemo(
    () => [
      { variant: 'Greedy', gap: 3.8, time: 0.4, pruning: 12 },
      { variant: 'DP', gap: 1.2, time: 28.4, pruning: 31 },
      { variant: 'BB', gap: 0.1, time: 412.3, pruning: 41.2 },
      { variant: 'Greedy+BB', gap: 0.08, time: 187.4, pruning: 62.8 },
      { variant: 'DP+BB', gap: 0.04, time: 95.2, pruning: 78.3 },
      { variant: 'GDBB', gap: 0.24, time: 22.3, pruning: 91.7 },
    ],
    [],
  );

  const heatmapAlgorithms = ['GDBB', 'CPLEX', 'Gurobi', 'LNS', 'OR-Tools'];
  const heatmapMatrix = useMemo(
    () => [
      [
        { p: 1.0, d: 0 },
        { p: 0.001, d: 1.24 },
        { p: 0.003, d: 1.05 },
        { p: 0.002, d: 1.16 },
        { p: 0.004, d: 0.98 },
      ],
      [
        { p: 0.001, d: -1.24 },
        { p: 1.0, d: 0 },
        { p: 0.08, d: 0.19 },
        { p: 0.02, d: 0.52 },
        { p: 0.012, d: 0.61 },
      ],
      [
        { p: 0.003, d: -1.05 },
        { p: 0.08, d: -0.19 },
        { p: 1.0, d: 0 },
        { p: 0.03, d: 0.41 },
        { p: 0.018, d: 0.53 },
      ],
      [
        { p: 0.002, d: -1.16 },
        { p: 0.02, d: -0.52 },
        { p: 0.03, d: -0.41 },
        { p: 1.0, d: 0 },
        { p: 0.22, d: 0.12 },
      ],
      [
        { p: 0.004, d: -0.98 },
        { p: 0.012, d: -0.61 },
        { p: 0.018, d: -0.53 },
        { p: 0.22, d: -0.12 },
        { p: 1.0, d: 0 },
      ],
    ],
    [],
  );

  const pruningFlowValues = useMemo(
    () => ({
      total: 4_820_000,
      greedy: 1_920_000,
      dp: 1_430_000,
      explored: 1_070_000,
      optimal: 400_000,
    }),
    [],
  );

  return (
    <section className="space-y-6 pb-8">
      <header className="glass-panel-strong rounded-3xl p-6 md:p-8">
        <span className="eyebrow">Benchmark Terminal</span>
        <h1 className="section-title mt-3">High-density evidence dashboard for performance, quality, and significance.</h1>
        <p className="section-subtitle mt-3">
          Based on benchmark constants: {GDBB_STATS.benchmark_instances} instances, {GDBB_STATS.benchmark_classes} classes, average gap{' '}
          {GDBB_STATS.avg_optimality_gap}, pruning {GDBB_STATS.nodes_pruned}.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="metric-card">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">Avg Gap</p>
          <p className="font-display text-3xl text-neural">{GDBB_STATS.avg_optimality_gap}</p>
        </article>
        <article className="metric-card">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">Nodes Pruned</p>
          <p className="font-display text-3xl text-sigma">{GDBB_STATS.nodes_pruned}</p>
        </article>
        <article className="metric-card">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">Speedup vs CPLEX</p>
          <p className="font-display text-3xl text-dp">{GDBB_STATS.speedup_vs_cplex}</p>
        </article>
        <article className="metric-card">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">n Range</p>
          <p className="font-display text-3xl text-bb">{GDBB_STATS.n_range}</p>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="glass-panel rounded-2xl p-4">
          <h2 className="mb-3 font-display text-xl">1) Optimality Gap Radar</h2>
          <RadarChart data={radarData} />
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <h2 className="mb-3 font-display text-xl">2) Computation Time Scaling (log-log)</h2>
          <ScalingChart points={scalingData} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="glass-panel rounded-2xl p-4">
          <h2 className="mb-3 font-display text-xl">3) Ablation Study (Grouped)</h2>
          <AblationGroupedBars rows={ablationRows} />
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <h2 className="mb-3 font-display text-xl">4) Sigma Pruning Flow</h2>
          <PruningFlow values={pruningFlowValues} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="glass-panel rounded-2xl p-4">
          <h2 className="mb-3 font-display text-xl">5) Statistical Significance Heatmap</h2>
          <HeatmapTable algorithms={heatmapAlgorithms} matrix={heatmapMatrix} />
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <h2 className="mb-3 font-display text-xl">6) Live Leaderboard Runtime Strip</h2>
          <LeaderboardRuntimeStrip rows={rows} />
        </div>
      </div>

      <div className="glass-panel-strong rounded-2xl p-4">
        <h2 className="mb-3 font-display text-xl">Leaderboard Table (refresh every 30s)</h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--surface-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-muted)]">
              <tr className="text-left text-[var(--text-secondary)]">
                <th className="px-3 py-2">Nickname</th>
                <th className="px-3 py-2">Gap</th>
                <th className="px-3 py-2">Runtime (ms)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={`${row.nickname}-${idx}`} className="border-t border-[var(--surface-border)]">
                  <td className="px-3 py-2">{row.nickname}</td>
                  <td className="px-3 py-2">{(row.gap * 100).toFixed(2)}%</td>
                  <td className="px-3 py-2">{row.runtime_ms}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td className="px-3 py-3 text-[var(--text-secondary)]" colSpan={3}>
                    No leaderboard runs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

