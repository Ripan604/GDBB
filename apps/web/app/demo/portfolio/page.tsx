'use client';

import { useMemo, useState } from 'react';

type Asset = {
  ticker: string;
  sector: 'Tech' | 'Health' | 'Finance' | 'Energy' | 'Industrial';
  risk: number;
  ret: number;
  sharpe: number;
  cap: number;
};

const assets: Asset[] = [
  { ticker: 'A1', sector: 'Tech', risk: 18, ret: 14, sharpe: 0.78, cap: 800 },
  { ticker: 'A2', sector: 'Tech', risk: 22, ret: 16, sharpe: 0.73, cap: 620 },
  { ticker: 'A3', sector: 'Health', risk: 12, ret: 9, sharpe: 0.75, cap: 430 },
  { ticker: 'A4', sector: 'Finance', risk: 16, ret: 10, sharpe: 0.62, cap: 520 },
  { ticker: 'A5', sector: 'Energy', risk: 20, ret: 11, sharpe: 0.55, cap: 490 },
  { ticker: 'A6', sector: 'Industrial', risk: 14, ret: 8, sharpe: 0.57, cap: 360 },
  { ticker: 'A7', sector: 'Health', risk: 10, ret: 7, sharpe: 0.7, cap: 280 },
  { ticker: 'A8', sector: 'Finance', risk: 19, ret: 13, sharpe: 0.68, cap: 410 },
  { ticker: 'A9', sector: 'Tech', risk: 24, ret: 18, sharpe: 0.75, cap: 910 },
  { ticker: 'A10', sector: 'Industrial', risk: 17, ret: 12, sharpe: 0.66, cap: 300 },
];

const sectorColor: Record<Asset['sector'], string> = {
  Tech: '#3fd2ff',
  Health: '#4ce4b1',
  Finance: '#7d8fff',
  Energy: '#ff8f57',
  Industrial: '#f6d365',
};

export default function PortfolioDemoPage() {
  const [k, setK] = useState(4);
  const [targetReturn, setTargetReturn] = useState(11);
  const [riskBudget, setRiskBudget] = useState(18);

  const selected = useMemo(() => {
    return [...assets]
      .sort((a, b) => b.sharpe - a.sharpe)
      .filter((asset) => asset.risk <= riskBudget && asset.ret >= targetReturn - 4)
      .slice(0, k);
  }, [k, riskBudget, targetReturn]);

  const portfolio = useMemo(() => {
    if (!selected.length) return { risk: 0, ret: 0, sharpe: 0 };
    const sumRisk = selected.reduce((sum, asset) => sum + asset.risk, 0);
    const sumRet = selected.reduce((sum, asset) => sum + asset.ret, 0);
    const sumSharpe = selected.reduce((sum, asset) => sum + asset.sharpe, 0);
    return {
      risk: sumRisk / selected.length,
      ret: sumRet / selected.length,
      sharpe: sumSharpe / selected.length,
    };
  }, [selected]);

  return (
    <section className="space-y-6 pb-8">
      <header className="glass-panel-strong rounded-3xl p-6">
        <span className="eyebrow">Live Demo - CCPO</span>
        <h1 className="section-title mt-3">Portfolio galaxy with sparse-selection controls.</h1>
        <p className="section-subtitle mt-3">
          Select top-K assets under risk and return constraints. This demonstrates sparse portfolio selection behavior in the GDBB framework.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="glass-panel rounded-2xl p-4">
          <h2 className="mb-3 font-display text-2xl">Asset Galaxy</h2>
          <svg viewBox="0 0 720 430" className="h-[430px] w-full rounded-xl border border-[var(--surface-border)] bg-black/25">
            {assets.map((asset, idx) => {
              const x = 80 + asset.risk * 24;
              const y = 380 - asset.ret * 20;
              const selectedAsset = selected.some((entry) => entry.ticker === asset.ticker);
              const r = 4 + asset.cap / 220;
              return (
                <g key={asset.ticker}>
                  <circle cx={x} cy={y} r={r + 6} fill={selectedAsset ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'} />
                  <circle cx={x} cy={y} r={r} fill={sectorColor[asset.sector]} />
                  <text x={x + 8} y={y - 8} fill="#d8e9ff" fontSize={10}>
                    {asset.ticker}
                  </text>
                </g>
              );
            })}
            <line x1="76" y1="20" x2="76" y2="390" stroke="rgba(188,207,233,0.45)" />
            <line x1="76" y1="390" x2="700" y2="390" stroke="rgba(188,207,233,0.45)" />
            <text x="686" y="410" fill="rgba(188,207,233,0.85)" fontSize={11}>
              Risk
            </text>
            <text x="30" y="24" fill="rgba(188,207,233,0.85)" fontSize={11}>
              Return
            </text>
          </svg>
        </div>

        <aside className="space-y-4">
          <section className="glass-panel rounded-2xl p-4">
            <h2 className="font-display text-2xl">Controls</h2>
            <div className="mt-3 space-y-3">
              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  <span>K assets</span>
                  <span>{k}</span>
                </div>
                <input className="w-full" type="range" min={2} max={8} value={k} onChange={(event) => setK(Number(event.target.value))} />
              </label>
              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  <span>Target return</span>
                  <span>{targetReturn}%</span>
                </div>
                <input className="w-full" type="range" min={6} max={18} value={targetReturn} onChange={(event) => setTargetReturn(Number(event.target.value))} />
              </label>
              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  <span>Risk budget</span>
                  <span>{riskBudget}%</span>
                </div>
                <input className="w-full" type="range" min={10} max={25} value={riskBudget} onChange={(event) => setRiskBudget(Number(event.target.value))} />
              </label>
            </div>
          </section>

          <section className="glass-panel rounded-2xl p-4">
            <h3 className="font-display text-xl">Selected Portfolio</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Tickers: {selected.map((asset) => asset.ticker).join(', ') || 'none'}</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">Return</p>
                <p className="font-display text-xl text-neural">{portfolio.ret.toFixed(1)}%</p>
              </div>
              <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">Risk</p>
                <p className="font-display text-xl text-bb">{portfolio.risk.toFixed(1)}%</p>
              </div>
              <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">Sharpe</p>
                <p className="font-display text-xl text-sigma">{portfolio.sharpe.toFixed(2)}</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

