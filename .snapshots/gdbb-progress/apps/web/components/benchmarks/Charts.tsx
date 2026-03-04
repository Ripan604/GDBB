'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

type Metric = { label: string; value: number };

export function RadarChart({ data }: { data: Metric[] }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const width = 320;
    const height = 320;
    const radius = 110;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);
    const angle = (2 * Math.PI) / data.length;
    const scale = d3.scaleLinear().domain([0, 100]).range([0, radius]);

    data.forEach((d, i) => {
      const a = i * angle - Math.PI / 2;
      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', Math.cos(a) * radius)
        .attr('y2', Math.sin(a) * radius)
        .attr('stroke', '#4a5c7c');
      g.append('text')
        .attr('x', Math.cos(a) * (radius + 16))
        .attr('y', Math.sin(a) * (radius + 16))
        .attr('fill', '#7b9ec4')
        .attr('font-size', 10)
        .attr('text-anchor', 'middle')
        .text(d.label);
    });

    const path = d3.lineRadial<Metric>()
      .radius((d) => scale(d.value))
      .angle((_, i) => i * angle)
      .curve(d3.curveLinearClosed);

    g.append('path')
      .datum(data)
      .attr('transform', 'rotate(-90)')
      .attr('d', path)
      .attr('fill', 'rgba(0, 212, 255, 0.2)')
      .attr('stroke', '#00d4ff')
      .attr('stroke-width', 2);
  }, [data]);

  return <svg ref={ref} viewBox="0 0 320 320" className="h-80 w-full" />;
}

export function ScalingChart() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const width = 460;
    const height = 250;
    const margin = { top: 20, right: 20, bottom: 35, left: 45 };
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const points = [50, 100, 200, 500, 1000].map((n) => ({
      n,
      gdbb: 0.02 * n ** 1.2,
      cplex: 0.06 * n ** 1.45,
    }));

    const x = d3.scaleLog().domain([50, 1000]).range([margin.left, width - margin.right]);
    const y = d3.scaleLog().domain([1, 2000]).range([height - margin.bottom, margin.top]);

    const g = svg.append('g');
    g.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(5, '~s'));
    g.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5, '~s'));

    const line = d3
      .line<{ n: number; gdbb: number; cplex: number }>()
      .x((d) => x(d.n))
      .y((d) => y(d.gdbb));
    g.append('path')
      .datum(points)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', '#00d4ff')
      .attr('stroke-width', 2.5);

    const line2 = d3
      .line<{ n: number; gdbb: number; cplex: number }>()
      .x((d) => x(d.n))
      .y((d) => y(d.cplex));
    g.append('path')
      .datum(points)
      .attr('d', line2)
      .attr('fill', 'none')
      .attr('stroke', '#ff6b35')
      .attr('stroke-width', 2.5);
  }, []);

  return <svg ref={ref} viewBox="0 0 460 250" className="h-64 w-full" />;
}

export function AblationBars() {
  const data = [
    { name: 'Greedy', gap: 3.8, time: 0.4 },
    { name: 'DP', gap: 1.2, time: 28.4 },
    { name: 'BB', gap: 0.1, time: 412.3 },
    { name: 'Full', gap: 0.24, time: 22.3 },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      {data.map((d) => (
        <div key={d.name} className="rounded-lg border border-white/10 p-2">
          <p className="font-mono text-[var(--text-secondary)]">{d.name}</p>
          <p>Gap: {d.gap}%</p>
          <p>Time: {d.time}s</p>
        </div>
      ))}
    </div>
  );
}

export function HeatmapTable() {
  const rows = ['GDBB', 'CPLEX', 'Gurobi', 'LNS'];
  return (
    <table className="w-full text-xs">
      <thead>
        <tr>
          <th className="text-left">Algorithm</th>
          <th>p-value</th>
          <th>Cohen d</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r} className="border-t border-white/10">
            <td className="py-1">{r}</td>
            <td className="text-center">{(0.001 + i * 0.004).toFixed(3)}</td>
            <td className="text-center">{(0.8 - i * 0.15).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

