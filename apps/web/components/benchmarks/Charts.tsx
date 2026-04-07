'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';

export type RadarAxis = {
  label: string;
  gdbb: number;
  cplex: number;
  gurobi: number;
};

export type ScalingPoint = {
  n: number;
  gdbb: number;
  cplex: number;
  gurobi: number;
};

export type AblationRow = {
  variant: string;
  gap: number;
  time: number;
  pruning: number;
};

export type DecompositionSensitivityPoint = {
  k: number;
  runtime_s: number;
  pruning_pct: number;
};

export function RadarChart({ data }: { data: RadarAxis[] }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const width = 380;
    const height = 360;
    const radius = 126;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);
    const angleStep = (Math.PI * 2) / data.length;
    const scale = d3.scaleLinear().domain([0, 100]).range([0, radius]);

    for (let ring = 20; ring <= 100; ring += 20) {
      g.append('circle').attr('r', scale(ring)).attr('fill', 'none').attr('stroke', 'rgba(170,196,228,0.2)');
      g.append('text')
        .attr('x', 4)
        .attr('y', -scale(ring) + 12)
        .attr('font-size', 10)
        .attr('fill', 'rgba(190,207,230,0.8)')
        .text(`${ring}`);
    }

    data.forEach((axis, idx) => {
      const angle = idx * angleStep - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      g.append('line').attr('x1', 0).attr('y1', 0).attr('x2', x).attr('y2', y).attr('stroke', 'rgba(170,196,228,0.35)');
      g.append('text')
        .attr('x', Math.cos(angle) * (radius + 20))
        .attr('y', Math.sin(angle) * (radius + 20))
        .attr('text-anchor', 'middle')
        .attr('font-size', 11)
        .attr('fill', 'rgba(211,226,245,0.95)')
        .text(axis.label);
    });

    const line = d3
      .lineRadial<{ value: number }>()
      .radius((d) => scale(d.value))
      .angle((_, i) => i * angleStep)
      .curve(d3.curveLinearClosed);

    const renderSeries = (key: 'gdbb' | 'cplex' | 'gurobi', fill: string, stroke: string) => {
      const values = data.map((entry) => ({ value: entry[key] }));
      g.append('path')
        .datum(values)
        .attr('transform', 'rotate(-90)')
        .attr('d', line)
        .attr('fill', fill)
        .attr('stroke', stroke)
        .attr('stroke-width', 2.2);
    };

    renderSeries('cplex', 'rgba(255,143,87,0.18)', '#ff8f57');
    renderSeries('gurobi', 'rgba(125,143,255,0.14)', '#7d8fff');
    renderSeries('gdbb', 'rgba(63,210,255,0.25)', '#3fd2ff');
  }, [data]);

  return <svg ref={ref} viewBox="0 0 380 360" className="h-[350px] w-full" />;
}

export function ScalingChart({ points }: { points: ScalingPoint[] }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const width = 520;
    const height = 290;
    const margin = { top: 20, right: 18, bottom: 42, left: 54 };
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const x = d3.scaleLog().domain([50, 10000]).range([margin.left, width - margin.right]);
    const y = d3.scaleLog().domain([1, 20000]).range([height - margin.bottom, margin.top]);

    const renderAxis = svg.append('g');
    renderAxis
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(8, '~s'))
      .attr('color', 'rgba(185,204,228,0.9)');
    renderAxis
      .append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(8, '~s'))
      .attr('color', 'rgba(185,204,228,0.9)');

    svg.append('rect')
      .attr('x', x(3500))
      .attr('y', margin.top)
      .attr('width', x(10000) - x(3500))
      .attr('height', height - margin.bottom - margin.top)
      .attr('fill', 'rgba(255,143,87,0.08)');

    svg.append('text')
      .attr('x', x(3550))
      .attr('y', margin.top + 14)
      .attr('font-size', 10)
      .attr('fill', '#ffb79a')
      .text('CPLEX timeout zone');

    const line = d3
      .line<ScalingPoint>()
      .x((d) => x(d.n))
      .y((d, _, arr) => y(d.gdbb || arr[0]?.gdbb || 1));

    const draw = (key: 'gdbb' | 'cplex' | 'gurobi', color: string) => {
      const linePath = d3
        .line<ScalingPoint>()
        .x((d) => x(d.n))
        .y((d) => y(d[key]));
      svg.append('path').datum(points).attr('d', linePath).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2.6);
      svg
        .selectAll(`circle-${key}`)
        .data(points)
        .enter()
        .append('circle')
        .attr('cx', (d) => x(d.n))
        .attr('cy', (d) => y(d[key]))
        .attr('r', 2.8)
        .attr('fill', color);
    };

    draw('gdbb', '#3fd2ff');
    draw('gurobi', '#7d8fff');
    draw('cplex', '#ff8f57');

    svg.append('text').attr('x', width - 130).attr('y', 24).attr('fill', '#3fd2ff').attr('font-size', 11).text('GDBB');
    svg.append('text').attr('x', width - 130).attr('y', 40).attr('fill', '#7d8fff').attr('font-size', 11).text('Gurobi');
    svg.append('text').attr('x', width - 130).attr('y', 56).attr('fill', '#ff8f57').attr('font-size', 11).text('CPLEX');

    svg.append('text').attr('x', width / 2 - 16).attr('y', height - 10).attr('fill', 'rgba(190,206,228,0.9)').attr('font-size', 11).text('n (log)');
    svg.append('text')
      .attr('x', 15)
      .attr('y', height / 2)
      .attr('transform', `rotate(-90,15,${height / 2})`)
      .attr('fill', 'rgba(190,206,228,0.9)')
      .attr('font-size', 11)
      .text('runtime (s, log)');

    void line;
  }, [points]);

  return <svg ref={ref} viewBox="0 0 520 290" className="h-[290px] w-full" />;
}

export function AblationGroupedBars({ rows }: { rows: AblationRow[] }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const width = 560;
    const height = 280;
    const margin = { top: 20, right: 20, bottom: 70, left: 52 };
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const groups = rows.map((row) => row.variant);
    const x0 = d3.scaleBand().domain(groups).range([margin.left, width - margin.right]).padding(0.18);
    const x1 = d3.scaleBand().domain(['gap', 'time', 'pruning']).range([0, x0.bandwidth()]).padding(0.08);
    const y = d3.scaleLinear().domain([0, 100]).nice().range([height - margin.bottom, margin.top]);

    svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x0))
      .attr('color', 'rgba(185,204,228,0.9)')
      .selectAll('text')
      .attr('transform', 'rotate(-22)')
      .style('text-anchor', 'end');
    svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5)).attr('color', 'rgba(185,204,228,0.9)');

    const color = d3
      .scaleOrdinal<string, string>()
      .domain(['gap', 'time', 'pruning'])
      .range(['#ff8f57', '#7d8fff', '#4ce4b1']);

    const normalize = (row: AblationRow) => ({
      gap: Math.max(0, 100 - row.gap * 20),
      time: Math.max(0, 100 - row.time / 5),
      pruning: row.pruning,
    });

    const group = svg.append('g');
    rows.forEach((row) => {
      const baseX = x0(row.variant);
      if (baseX == null) return;
      const n = normalize(row);
      (['gap', 'time', 'pruning'] as const).forEach((key) => {
        const innerX = x1(key);
        if (innerX == null) return;
        group
          .append('rect')
          .attr('x', baseX + innerX)
          .attr('y', y(n[key]))
          .attr('width', x1.bandwidth())
          .attr('height', y(0) - y(n[key]))
          .attr('fill', color(key))
          .attr('opacity', 0.84);
      });
    });

    const legend = [
      { key: 'gap', label: 'Gap score', color: '#ff8f57' },
      { key: 'time', label: 'Time score', color: '#7d8fff' },
      { key: 'pruning', label: 'Pruning %', color: '#4ce4b1' },
    ];
    legend.forEach((item, idx) => {
      svg.append('rect').attr('x', width - 140).attr('y', 20 + idx * 18).attr('width', 10).attr('height', 10).attr('fill', item.color);
      svg.append('text').attr('x', width - 124).attr('y', 29 + idx * 18).attr('fill', '#d7e6fb').attr('font-size', 11).text(item.label);
    });
  }, [rows]);

  return <svg ref={ref} viewBox="0 0 560 280" className="h-[290px] w-full" />;
}

export function DecompositionSensitivityChart({ points }: { points: DecompositionSensitivityPoint[] }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const width = 560;
    const height = 300;
    const margin = { top: 20, right: 56, bottom: 46, left: 56 };
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const x = d3.scaleBand().domain(points.map((point) => String(point.k))).range([margin.left, width - margin.right]).padding(0.24);
    const yRuntime = d3.scaleLinear().domain([0, d3.max(points, (point) => point.runtime_s) ?? 1]).nice().range([height - margin.bottom, margin.top]);
    const yPruning = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);

    svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .attr('color', 'rgba(185,204,228,0.9)');
    svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(yRuntime).ticks(5)).attr('color', 'rgba(185,204,228,0.9)');
    svg.append('g').attr('transform', `translate(${width - margin.right},0)`).call(d3.axisRight(yPruning).ticks(5)).attr('color', 'rgba(185,204,228,0.9)');

    const sweetSpot = points.reduce((best, point) => {
      const score = point.pruning_pct / Math.max(point.runtime_s, 1);
      const bestScore = best.pruning_pct / Math.max(best.runtime_s, 1);
      return score > bestScore ? point : best;
    }, points[0] ?? { k: 0, runtime_s: 1, pruning_pct: 0 });

    const bandX = x(String(sweetSpot.k));
    if (bandX != null) {
      svg
        .append('rect')
        .attr('x', bandX - 8)
        .attr('y', margin.top)
        .attr('width', x.bandwidth() + 16)
        .attr('height', height - margin.top - margin.bottom)
        .attr('fill', 'rgba(76, 228, 177, 0.08)');
    }

    svg
      .append('g')
      .selectAll('rect')
      .data(points)
      .enter()
      .append('rect')
      .attr('x', (point) => x(String(point.k)) ?? 0)
      .attr('y', (point) => yRuntime(point.runtime_s))
      .attr('width', x.bandwidth())
      .attr('height', (point) => yRuntime(0) - yRuntime(point.runtime_s))
      .attr('rx', 8)
      .attr('fill', 'rgba(255, 143, 87, 0.72)');

    const line = d3
      .line<DecompositionSensitivityPoint>()
      .x((point) => (x(String(point.k)) ?? 0) + x.bandwidth() / 2)
      .y((point) => yPruning(point.pruning_pct));

    svg.append('path').datum(points).attr('d', line).attr('fill', 'none').attr('stroke', '#4ce4b1').attr('stroke-width', 3);
    svg
      .append('g')
      .selectAll('circle')
      .data(points)
      .enter()
      .append('circle')
      .attr('cx', (point) => (x(String(point.k)) ?? 0) + x.bandwidth() / 2)
      .attr('cy', (point) => yPruning(point.pruning_pct))
      .attr('r', 4)
      .attr('fill', '#4ce4b1');

    svg.append('text').attr('x', margin.left).attr('y', 14).attr('fill', '#ffb79a').attr('font-size', 11).text('Runtime (s)');
    svg.append('text').attr('x', width - margin.right - 64).attr('y', 14).attr('fill', '#8ff1cb').attr('font-size', 11).text('Pruning (%)');
    svg
      .append('text')
      .attr('x', (bandX ?? margin.left) + x.bandwidth() / 2)
      .attr('y', height - margin.bottom - 10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#b8f6df')
      .attr('font-size', 11)
      .text(`sweet spot k=${sweetSpot.k}`);
  }, [points]);

  return <svg ref={ref} viewBox="0 0 560 300" className="h-[300px] w-full" />;
}

export function PruningFlow({ values }: { values: { total: number; greedy: number; dp: number; explored: number; optimal: number } }) {
  const stages = useMemo(
    () => [
      { label: 'Total', value: values.total, color: '#9db4d2' },
      { label: 'Greedy Bound Pruned', value: values.greedy, color: '#3fd2ff' },
      { label: 'DP Bound Pruned', value: values.dp, color: '#7d8fff' },
      { label: 'Explored', value: values.explored, color: '#ff8f57' },
      { label: 'Optimal', value: values.optimal, color: '#4ce4b1' },
    ],
    [values.dp, values.explored, values.greedy, values.optimal, values.total],
  );

  const max = Math.max(...stages.map((stage) => stage.value), 1);

  return (
    <div className="space-y-3">
      {stages.map((stage) => (
        <div key={stage.label} className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="uppercase tracking-[0.12em] text-[var(--text-secondary)]">{stage.label}</span>
            <span className="font-semibold text-[var(--text-primary)]">{stage.value.toLocaleString()}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/20">
            <div className="h-full rounded-full" style={{ width: `${(stage.value / max) * 100}%`, backgroundColor: stage.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HeatmapTable({
  algorithms,
  matrix,
}: {
  algorithms: string[];
  matrix: Array<Array<{ p: number; d: number }>>;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--surface-border)]">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="bg-[var(--surface-muted)]">
            <th className="px-3 py-2 text-left">Algorithm</th>
            {algorithms.map((algorithm) => (
              <th key={algorithm} className="px-3 py-2 text-center">
                {algorithm}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {algorithms.map((algorithm, r) => (
            <tr key={algorithm} className="border-t border-[var(--surface-border)]">
              <td className="px-3 py-2 font-semibold">{algorithm}</td>
              {algorithms.map((_, c) => {
                const cell = matrix[r]?.[c] ?? { p: 1, d: 0 };
                const intensity = Math.min(1, Math.abs(cell.d) / 1.5);
                const background = `rgba(63, 210, 255, ${0.08 + intensity * 0.32})`;
                const significant = cell.p < 0.05;
                return (
                  <td key={`${algorithm}-${c}`} className="px-3 py-2 text-center" style={{ background }}>
                    <div className="text-xs text-[var(--text-secondary)]">p={cell.p.toFixed(3)}</div>
                    <div className={`text-sm ${significant ? 'text-sigma' : 'text-[var(--text-primary)]'}`}>d={cell.d.toFixed(2)}</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LeaderboardRuntimeStrip({ rows }: { rows: Array<{ nickname: string; gap: number; runtime_ms: number }> }) {
  const best = Math.min(...rows.map((row) => row.runtime_ms), 1);
  const worst = Math.max(...rows.map((row) => row.runtime_ms), best + 1);

  return (
    <div className="space-y-2">
      {rows.map((row, idx) => {
        const normalized = (row.runtime_ms - best) / Math.max(1, worst - best);
        const width = 20 + (1 - normalized) * 80;
        return (
          <div key={`${row.nickname}-${idx}`} className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold">{row.nickname}</span>
              <span className="text-[var(--text-secondary)]">{(row.gap * 100).toFixed(2)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/20">
              <div className="h-full rounded-full bg-gradient-to-r from-neural to-sigma" style={{ width: `${width}%` }} />
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">{row.runtime_ms} ms</p>
          </div>
        );
      })}
    </div>
  );
}
