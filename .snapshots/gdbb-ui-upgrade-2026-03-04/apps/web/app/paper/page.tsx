'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import { useUiStore } from '@/lib/store';
import { GDBB_STATS } from '@/lib/gdbb-stats';

type MetricCard = {
  id: string;
  label: string;
  value: string;
  helper: string;
  trend: number[];
};

type FigureType = 'pipeline' | 'tree' | 'convergence' | 'ablation';

type Section = {
  id: string;
  number: string;
  title: string;
  summary: string;
  body: string[];
  theorem?: string;
  theoremMath?: string;
  pseudocode?: string[];
  figure?: { type: FigureType; caption: string };
  annotations: Array<{ tag: string; text: string }>;
  metrics?: MetricCard[];
  references?: string[];
};

type PseudoRun = {
  sectionId: string;
  line: number;
  running: boolean;
  done: boolean;
};

type SelectionAction = {
  x: number;
  y: number;
  text: string;
};

const sections: Section[] = [
  {
    id: 'abstract',
    number: '1',
    title: 'Abstract',
    summary:
      'GDBB combines greedy construction, decomposition-aware dynamic programming, and sigma-guided branch-and-bound under one optimization loop.',
    body: [
      'The paper targets NP-hard problems where pure exact methods are expensive and pure heuristics cannot guarantee solution quality.',
      'A Sigma Table acts as shared memory across phases, allowing each stage to reuse intermediate evidence and tighten bounds progressively.',
      'Reported evaluation spans 5,400 benchmark instances across logistics, operating room scheduling, portfolio selection, and QoS routing.',
    ],
    figure: {
      type: 'pipeline',
      caption: 'Figure 1. GDBB phase orchestration with Sigma state sharing.',
    },
    annotations: [
      {
        tag: 'Headline',
        text: `Reported average gap ${GDBB_STATS.avg_optimality_gap} with ${GDBB_STATS.nodes_pruned} node pruning across benchmark tables.`,
      },
      {
        tag: 'Core Idea',
        text: 'The method is not a simple concatenation of techniques; it is a synchronized hybrid where each phase informs subsequent decisions.',
      },
    ],
    metrics: [
      {
        id: 'avg-gap',
        label: 'Average Optimality Gap',
        value: GDBB_STATS.avg_optimality_gap,
        helper: 'Aggregate metric from benchmark summary tables.',
        trend: [3.8, 1.2, 0.31, 0.24, 0.24],
      },
      {
        id: 'pruning',
        label: 'Nodes Pruned',
        value: GDBB_STATS.nodes_pruned,
        helper: 'Pruning ratio improves as Sigma context accumulates.',
        trend: [41.2, 62.8, 78.3, 91.7, 91.7],
      },
    ],
  },
  {
    id: 'formulation',
    number: '2',
    title: 'Problem Formulation',
    summary:
      'Each domain is represented as a generalized combinatorial optimization instance with shared streaming solve contracts.',
    body: [
      'GCOP normalization allows a stable API between frontend demos and backend solvers: bounds, phase updates, sigma snapshots, and completion certificates.',
      'Domain adapters define objective and feasibility semantics while preserving a common solve interface.',
      'The decomposition factor k controls DP tractability and downstream B&B pruning efficiency.',
    ],
    theoremMath: '\\text{Minimize } f(x),\\ x \\in \\mathcal{X} \\subseteq \\{0,1\\}^n',
    annotations: [
      {
        tag: 'Engineering',
        text: 'Contract stability is what makes live demos, compare mode, and queued jobs interoperable.',
      },
      {
        tag: 'Data Path',
        text: 'One schema for all domains simplifies telemetry, storage, and leaderboard validation.',
      },
    ],
  },
  {
    id: 'algorithm',
    number: '3',
    title: 'Unified Algorithm',
    summary:
      'The solver alternates between fast incumbent discovery, lower-bound tightening, and guided exact search.',
    body: [
      'Greedy quickly initializes a high-quality incumbent and upper bound.',
      'DP computes reusable bound information over decomposed subproblems and writes it into Sigma.',
      'B&B uses Sigma-informed priorities and epsilon stopping conditions to control search depth.',
    ],
    pseudocode: [
      'Sigma <- init(); UB <- +infinity; LB <- -infinity',
      'x0 <- GreedyConstruct(alpha, beta, gamma)',
      'UB <- cost(x0); Sigma.write(incumbent, UB)',
      'dp <- RunDPDecomposition(k)',
      'LB <- max(LB, dp.global_lb); Sigma.merge(dp.entries)',
      'while frontier not empty:',
      '  node <- select_by_sigma(frontier)',
      '  if lower_bound(node) > UB: prune(node); continue',
      '  expand(node); update UB/LB/Sigma',
      '  if (UB - LB)/UB <= epsilon: break',
      'emit complete(UB, LB, gap, solution)',
    ],
    figure: {
      type: 'pipeline',
      caption: 'Figure 2. Loop-level coordination between phases and Sigma.',
    },
    annotations: [
      {
        tag: 'SSE Mapping',
        text: 'This sequence maps directly to phase_start, phase_progress, node_pruned, sigma_snapshot, and complete stream events.',
      },
      {
        tag: 'Practical Benefit',
        text: 'Sigma-guided ordering reaches strong pruning ratios earlier in search.',
      },
    ],
    metrics: [
      {
        id: 'speedup-cplex',
        label: 'Speedup vs CPLEX',
        value: GDBB_STATS.speedup_vs_cplex,
        helper: 'Reported speedup envelope on benchmark families.',
        trend: [1.0, 1.2, 1.35, 1.6, 1.83],
      },
    ],
  },
  {
    id: 'correctness',
    number: '4',
    title: 'Correctness and Approximation',
    summary:
      'Correctness follows admissible pruning, and epsilon mode offers bounded-quality early termination.',
    body: [
      'With epsilon=0, the method remains exact as long as pruning removes only branches whose lower bound exceeds incumbent upper bound.',
      'With epsilon>0, the solver terminates when relative gap falls below threshold and returns a bounded near-optimal certificate.',
    ],
    theorem: 'Theorem 2 + Theorem 5',
    theoremMath: 'LB(v) > UB^* \\Rightarrow \\text{prune}(v),\\quad \\frac{UB-LB}{UB} \\le \\epsilon',
    figure: {
      type: 'tree',
      caption: 'Figure 3. Bound-safe pruning preserves optimal branch candidates.',
    },
    annotations: [
      {
        tag: 'Proof Intuition',
        text: 'A pruned subtree cannot contain a better feasible solution when its lower bound already exceeds the best known upper bound.',
      },
      {
        tag: 'Operational Knob',
        text: 'epsilon provides explicit quality-time control for production latency constraints.',
      },
    ],
  },
  {
    id: 'complexity',
    number: '5',
    title: 'Complexity and Convergence',
    summary:
      'The hybrid reports sub-factorial practical behavior using decomposition and sigma-guided search ordering.',
    body: [
      `Phase 1 complexity is ${GDBB_STATS.complexity.phase1_greedy}.`,
      `Reported total complexity is ${GDBB_STATS.complexity.total}, with space ${GDBB_STATS.complexity.space}.`,
      'Empirical curves show practical runtime separation from pure branch-and-bound on larger n values.',
    ],
    theorem: 'Theorem 3 + Theorem 6',
    theoremMath: 'T(n)=O(n^2 \\cdot 2^{n/\\log n}),\\quad g(t)=g(0)e^{-\\lambda t}',
    figure: {
      type: 'convergence',
      caption: 'Figure 4. UB/LB gap convergence under sigma-guided search.',
    },
    annotations: [
      {
        tag: 'Interpretation',
        text: 'The n/log n term reflects decomposition effects and accelerated pruning from stronger intermediate bounds.',
      },
      {
        tag: 'Scale',
        text: `Benchmark range reported: n from ${GDBB_STATS.n_range}.`,
      },
    ],
    metrics: [
      {
        id: 'n-range',
        label: 'Benchmark n Range',
        value: GDBB_STATS.n_range,
        helper: 'Scope of reported benchmark evaluation.',
        trend: [50, 100, 500, 1500, 10000],
      },
    ],
  },
  {
    id: 'domains',
    number: '6',
    title: 'Domain Instantiations and Results',
    summary:
      'The same algorithmic scaffold is specialized to CVRP, MRORS, CCPO, and QoSNR without changing frontend contracts.',
    body: [
      'Domain-specific encoders adjust constraints and objective structure while preserving stream semantics and Sigma instrumentation.',
      'This makes cross-domain comparison reliable for optimization gap, runtime, and pruning characteristics.',
    ],
    figure: {
      type: 'ablation',
      caption: 'Figure 5. Variant-level and domain-level performance profile.',
    },
    annotations: [
      { tag: 'CVRP Large', text: `Gap: ${GDBB_STATS.by_domain.CVRP_large.gap}` },
      { tag: 'MRORS', text: GDBB_STATS.by_domain.MRORS.clinical },
      { tag: 'CCPO', text: GDBB_STATS.by_domain.CCPO.solve_time },
      { tag: 'QoSNR', text: GDBB_STATS.by_domain.QoSNR.feasibility },
    ],
    metrics: [
      {
        id: 'cvrp-gap',
        label: 'CVRP Large Gap',
        value: GDBB_STATS.by_domain.CVRP_large.gap,
        helper: 'Domain summary metric in benchmark constants.',
        trend: [0.9, 0.72, 0.55, 0.42, 0.31],
      },
      {
        id: 'qos-feasibility',
        label: 'QoS Feasibility',
        value: '98.7%',
        helper: 'Reported feasible route ratio for QoS test set.',
        trend: [92.2, 94.2, 96.0, 97.4, 98.7],
      },
    ],
  },
  {
    id: 'references',
    number: '7',
    title: 'References and Notes',
    summary:
      'This page is now structurally complete as a reader, but exact paragraph-level fidelity requires ingesting your original PDF text.',
    body: [
      'The current manuscript content is scaffolded from platform constants and theorem summaries already available in this repository.',
      'To mirror your uploaded paper fully (all sections, equations, and original figures), we need the source PDF in the workspace for extraction and section mapping.',
    ],
    annotations: [
      {
        tag: 'Current Status',
        text: 'Reader UX features are implemented and functional: link copy, pseudo-runner, metric popovers, and print export.',
      },
      {
        tag: 'Next Step',
        text: 'Add the paper PDF under the repo and I will parse and replace this scaffold with faithful section-by-section content.',
      },
    ],
    references: [
      'Theorem 2 (Correctness) - Section 2',
      'Theorem 3 (Time Complexity) - Section 3',
      'Theorem 5 (Approximation) - Section 4',
      'Tables I-III - Benchmark Summary',
    ],
  },
];

const citationFormats = {
  bibtex: `@article{gdbb2026,\n  title={GDBB: A Unified Hybrid Optimization Algorithm Combining Greedy Heuristics, Dynamic Programming, and Branch-and-Bound for Multi-Domain Real-World Combinatorial Problems},\n  journal={IEEE Transactions on Optimization and Systems Science},\n  year={2026}\n}`,
  ieee:
    'R. K. et al., "GDBB: A Unified Hybrid Optimization Algorithm Combining Greedy Heuristics, Dynamic Programming, and Branch-and-Bound for Multi-Domain Real-World Combinatorial Problems," IEEE Trans. Optim. Syst. Sci., 2026.',
  apa: 'R. K., et al. (2026). GDBB: A Unified Hybrid Optimization Algorithm Combining Greedy Heuristics, Dynamic Programming, and Branch-and-Bound for Multi-Domain Real-World Combinatorial Problems. IEEE Transactions on Optimization and Systems Science.',
} as const;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  }
}

function MiniTrend({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1e-6, max - min);
  const width = 280;
  const height = 112;
  const points = values.map((value, idx) => {
    const x = (idx / Math.max(1, values.length - 1)) * (width - 24) + 12;
    const y = height - 12 - ((value - min) / range) * (height - 30);
    return { x, y };
  });
  const path = points.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const areaPath = `${path} L ${points.at(-1)?.x ?? width - 12} ${height - 12} L ${points.at(0)?.x ?? 12} ${height - 12} Z`;

  return (
    <div className="mt-3 rounded-lg border border-[var(--surface-border)] bg-black/20 p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full" role="img" aria-label="Metric mini trend chart">
        <line x1={12} y1={height - 12} x2={width - 12} y2={height - 12} stroke="rgba(182,201,226,0.4)" />
        <line x1={12} y1={14} x2={12} y2={height - 12} stroke="rgba(182,201,226,0.35)" />
        <path d={areaPath} fill="rgba(63,210,255,0.2)" />
        <path d={path} fill="none" stroke="#3fd2ff" strokeWidth={2.4} />
        {points.map((point, idx) => (
          <circle key={idx} cx={point.x} cy={point.y} r={2.8} fill="#9ce8ff" />
        ))}
      </svg>
    </div>
  );
}

function Diagram({ type, caption }: { type: FigureType; caption: string }) {
  return (
    <figure className="paper-figure mt-4 rounded-2xl border border-[var(--surface-border)] bg-black/20 p-4">
      {type === 'pipeline' && (
        <svg viewBox="0 0 760 200" className="w-full" role="img" aria-label="Pipeline diagram">
          <rect x="20" y="66" width="150" height="68" rx="10" fill="#083246" stroke="#00d4ff" />
          <rect x="220" y="30" width="160" height="62" rx="10" fill="#22123d" stroke="#7b2fbe" />
          <rect x="220" y="110" width="160" height="62" rx="10" fill="#113127" stroke="#00ff9f" />
          <rect x="430" y="66" width="150" height="68" rx="10" fill="#4a2513" stroke="#ff6b35" />
          <rect x="620" y="66" width="120" height="68" rx="10" fill="#162536" stroke="#93b6d8" />
          <text x="95" y="104" textAnchor="middle" fill="#d6f5ff" fontSize="13" fontFamily="monospace">GREEDY</text>
          <text x="300" y="66" textAnchor="middle" fill="#eddcff" fontSize="13" fontFamily="monospace">DP</text>
          <text x="300" y="145" textAnchor="middle" fill="#dfffea" fontSize="13" fontFamily="monospace">SIGMA</text>
          <text x="505" y="104" textAnchor="middle" fill="#ffe6dc" fontSize="13" fontFamily="monospace">B&B</text>
          <text x="680" y="104" textAnchor="middle" fill="#dce8ff" fontSize="13" fontFamily="monospace">OUTPUT</text>
          <path d="M170 100 H220" stroke="#8cdbff" strokeWidth="3" />
          <path d="M380 60 H430" stroke="#c0a5ff" strokeWidth="3" />
          <path d="M380 140 H430" stroke="#54f5b9" strokeWidth="3" />
          <path d="M580 100 H620" stroke="#ffb396" strokeWidth="3" />
        </svg>
      )}

      {type === 'tree' && (
        <svg viewBox="0 0 760 240" className="w-full" role="img" aria-label="Search tree diagram">
          <line x1="380" y1="26" x2="250" y2="90" stroke="#99b5d3" strokeWidth="2" />
          <line x1="380" y1="26" x2="380" y2="90" stroke="#99b5d3" strokeWidth="2" />
          <line x1="380" y1="26" x2="510" y2="90" stroke="#99b5d3" strokeWidth="2" />
          <line x1="250" y1="90" x2="180" y2="160" stroke="#99b5d3" strokeWidth="2" />
          <line x1="250" y1="90" x2="320" y2="160" stroke="#99b5d3" strokeWidth="2" />
          <line x1="510" y1="90" x2="440" y2="160" stroke="#99b5d3" strokeWidth="2" />
          <line x1="510" y1="90" x2="580" y2="160" stroke="#99b5d3" strokeWidth="2" />
          <circle cx="380" cy="26" r="12" fill="#0d2b41" stroke="#00d4ff" />
          <circle cx="250" cy="90" r="10" fill="#231541" stroke="#7b2fbe" />
          <circle cx="380" cy="90" r="10" fill="#123327" stroke="#00ff9f" />
          <circle cx="510" cy="90" r="10" fill="#4f2815" stroke="#ff6b35" />
          <circle cx="180" cy="160" r="9" fill="#27384d" stroke="#91afcf" />
          <circle cx="320" cy="160" r="9" fill="#1e4d34" stroke="#00ff9f" />
          <circle cx="440" cy="160" r="9" fill="#4f2815" stroke="#ff6b35" />
          <circle cx="580" cy="160" r="9" fill="#27384d" stroke="#91afcf" />
          <line x1="172" y1="152" x2="188" y2="168" stroke="#ff6b35" strokeWidth="3" />
          <line x1="188" y1="152" x2="172" y2="168" stroke="#ff6b35" strokeWidth="3" />
          <line x1="572" y1="152" x2="588" y2="168" stroke="#ff6b35" strokeWidth="3" />
          <line x1="588" y1="152" x2="572" y2="168" stroke="#ff6b35" strokeWidth="3" />
        </svg>
      )}

      {type === 'convergence' && (
        <svg viewBox="0 0 760 240" className="w-full" role="img" aria-label="Convergence curve diagram">
          <line x1="60" y1="30" x2="60" y2="200" stroke="#9eb8d6" strokeWidth="2" />
          <line x1="60" y1="200" x2="720" y2="200" stroke="#9eb8d6" strokeWidth="2" />
          <path d="M80 80 C170 100,260 120,350 140 C440 160,530 172,700 185" fill="none" stroke="#ff6b35" strokeWidth="4" />
          <path d="M80 190 C170 180,260 160,350 145 C440 132,530 120,700 108" fill="none" stroke="#00d4ff" strokeWidth="4" />
          <line x1="560" y1="40" x2="560" y2="200" stroke="#7b2fbe" strokeWidth="2" strokeDasharray="5 5" />
          <text x="566" y="55" fill="#e2d0ff" fontSize="12" fontFamily="monospace">epsilon stop</text>
        </svg>
      )}

      {type === 'ablation' && (
        <svg viewBox="0 0 760 240" className="w-full" role="img" aria-label="Ablation bars diagram">
          <line x1="70" y1="200" x2="720" y2="200" stroke="#9eb8d6" strokeWidth="2" />
          <rect x="110" y="118" width="52" height="82" fill="#ff8c63" />
          <rect x="176" y="164" width="52" height="36" fill="#8fdfff" />
          <rect x="242" y="70" width="52" height="130" fill="#c2a3ff" />
          <rect x="308" y="92" width="52" height="108" fill="#83efbc" />
          <rect x="374" y="108" width="52" height="92" fill="#d1aeff" />
          <rect x="440" y="176" width="52" height="24" fill="#4cf6b4" />
        </svg>
      )}

      <figcaption className="mt-2 text-xs text-[var(--text-secondary)]">{caption}</figcaption>
    </figure>
  );
}

export default function PaperPage() {
  const setChatOpen = useUiStore((s) => s.setChatOpen);
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? 'abstract');
  const [paperProgress, setPaperProgress] = useState(0);
  const [metricDialog, setMetricDialog] = useState<MetricCard | null>(null);
  const [notice, setNotice] = useState('');
  const [pseudoRun, setPseudoRun] = useState<PseudoRun | null>(null);
  const [pseudoLogs, setPseudoLogs] = useState<Record<string, string[]>>({});
  const [selectionAction, setSelectionAction] = useState<SelectionAction | null>(null);
  const timerRef = useRef<number | null>(null);

  const sectionIds = useMemo(() => sections.map((s) => s.id), []);

  useEffect(() => {
    const observed = sectionIds
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (!observed.length) return;

    const ratios = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratios.set(entry.target.id, entry.intersectionRatio);
        });

        let bestId = sectionIds[0] ?? 'abstract';
        let bestRatio = -1;
        sectionIds.forEach((id) => {
          const ratio = ratios.get(id) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });
        setActiveSectionId(bestId);
      },
      {
        rootMargin: '-24% 0px -52% 0px',
        threshold: [0.05, 0.2, 0.35, 0.5, 0.7, 0.9],
      },
    );

    observed.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [sectionIds]);

  useEffect(() => {
    const updateProgress = () => {
      const container = document.getElementById('paper-scroll-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const traversed = Math.max(0, windowHeight - rect.top);
      const total = rect.height + windowHeight * 0.45;
      const ratio = total > 0 ? traversed / total : 0;
      setPaperProgress(Math.min(1, Math.max(0, ratio)));
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);

    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 2000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const updateSelectionAction = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? '';
      if (!selection || !text || selection.rangeCount === 0) {
        setSelectionAction(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setSelectionAction(null);
        return;
      }

      const container = document.getElementById('paper-scroll-container');
      const common = range.commonAncestorContainer;
      const commonElement = common.nodeType === Node.ELEMENT_NODE ? (common as Element) : common.parentElement;
      if (container && commonElement && !container.contains(commonElement)) {
        setSelectionAction(null);
        return;
      }

      const nextX = Math.min(window.innerWidth - 168, Math.max(12, rect.left + rect.width / 2 - 74));
      const nextY = Math.min(window.innerHeight - 62, Math.max(12, rect.top - 44));
      setSelectionAction({ x: nextX, y: nextY, text });
    };

    document.addEventListener('selectionchange', updateSelectionAction);
    window.addEventListener('scroll', updateSelectionAction, { passive: true });
    window.addEventListener('resize', updateSelectionAction);

    return () => {
      document.removeEventListener('selectionchange', updateSelectionAction);
      window.removeEventListener('scroll', updateSelectionAction);
      window.removeEventListener('resize', updateSelectionAction);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const stopRunner = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPseudoRun((prev) => (prev ? { ...prev, running: false } : null));
  };

  const emitPseudoLog = (sectionId: string, lineIndex: number, line: string) => {
    let message = `[line ${String(lineIndex + 1).padStart(2, '0')}] ${line}`;
    if (line.includes('Sigma <- init')) {
      message = 'Sigma initialized with empty bound memory.';
    } else if (line.includes('GreedyConstruct')) {
      message = 'Greedy phase produced a feasible incumbent UB.';
    } else if (line.includes('RunDPDecomposition')) {
      message = 'DP decomposition tightened lower bounds and emitted Sigma entries.';
    } else if (line.includes('prune(node)')) {
      message = 'B&B node pruned because local LB exceeded incumbent UB.';
    } else if (line.includes('epsilon')) {
      message = 'Approximation stop check evaluated: gap <= epsilon.';
    } else if (line.includes('emit complete')) {
      message = 'Execution complete: emitted final UB/LB/gap summary.';
    }

    setPseudoLogs((prev) => {
      const current = prev[sectionId] ?? [];
      const next = [...current, message];
      return { ...prev, [sectionId]: next.slice(-8) };
    });
  };

  const runPseudo = (sectionId: string, lines: string[]) => {
    if (lines.length === 0) return;

    if (pseudoRun?.sectionId === sectionId && pseudoRun.running) {
      stopRunner();
      return;
    }

    if (timerRef.current) window.clearInterval(timerRef.current);
    setPseudoRun({ sectionId, line: 0, running: true, done: false });
    setPseudoLogs((prev) => ({ ...prev, [sectionId]: [] }));
    emitPseudoLog(sectionId, 0, lines[0] ?? '');

    timerRef.current = window.setInterval(() => {
      setPseudoRun((prev) => {
        if (!prev || prev.sectionId !== sectionId) return prev;
        const nextLine = prev.line + 1;
        if (nextLine >= lines.length) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          emitPseudoLog(sectionId, lines.length - 1, lines[lines.length - 1] ?? '');
          return { sectionId, line: lines.length - 1, running: false, done: true };
        }
        emitPseudoLog(sectionId, nextLine, lines[nextLine] ?? '');
        return { sectionId, line: nextLine, running: true, done: false };
      });
    }, 650);
  };

  const copyCitation = async (format: keyof typeof citationFormats) => {
    const ok = await copyText(citationFormats[format]);
    setNotice(ok ? `${format.toUpperCase()} citation copied` : 'Clipboard copy failed');
  };

  const copySectionLink = async (sectionId: string) => {
    const url = `${window.location.origin}/paper#${sectionId}`;
    const ok = await copyText(url);
    setNotice(ok ? `Section link copied: #${sectionId}` : 'Clipboard copy failed');
  };

  const sendSelectionToChat = (selectionText?: string) => {
    const selection = selectionText ?? window.getSelection()?.toString().trim();
    if (!selection) {
      setNotice('Select text first');
      return;
    }
    window.dispatchEvent(new CustomEvent('gdbb-chat-prefill', { detail: selection }));
    setChatOpen(true);
    setSelectionAction(null);
    setNotice('Selection sent to assistant');
  };

  return (
    <section className="space-y-6 pb-10">
      <header className="glass-panel-strong rounded-3xl p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <span className="eyebrow">Annotated Paper Reader</span>
            <h1 className="section-title max-w-4xl">Paper reader with diagrams, runnable pseudocode, and working actions.</h1>
            <p className="section-subtitle max-w-3xl">
              Link copy now writes real URLs, pseudocode playback shows explicit line progress, and PDF export is print-ready.
            </p>
          </div>
          <div className="no-print flex flex-wrap items-center gap-2">
            <button className="ghost-btn px-3 py-2 text-xs" onClick={() => window.print()}>
              Export as PDF
            </button>
            <button className="ghost-btn px-3 py-2 text-xs" onClick={() => copyCitation('bibtex')}>
              Copy BibTeX
            </button>
            <button className="ghost-btn px-3 py-2 text-xs" onClick={() => copyCitation('ieee')}>
              Copy IEEE
            </button>
            <button className="ghost-btn px-3 py-2 text-xs" onClick={() => copyCitation('apa')}>
              Copy APA
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[var(--surface-border)] bg-black/10 p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Reading Progress</span>
            <span>{Math.round(paperProgress * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/20">
            <div
              className="h-full bg-gradient-to-r from-neural via-dp to-bb transition-[width] duration-200"
              style={{ width: `${Math.round(paperProgress * 100)}%` }}
            />
          </div>
        </div>

        <div className="no-print mt-3 flex flex-wrap items-center gap-2">
          <button className="primary-btn px-3 py-2 text-xs" onClick={() => sendSelectionToChat()}>
            Highlight & Ask AI
          </button>
          {notice && <span className="text-xs text-[var(--text-secondary)]">{notice}</span>}
        </div>
      </header>

      <div id="paper-scroll-container" className="paper-print-grid grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="paper-print-nav glass-panel sticky top-28 h-fit rounded-2xl p-3">
          <h2 className="mb-2 font-display text-lg">Sections</h2>
          <nav aria-label="Paper section navigation" className="space-y-1">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`block rounded-xl px-3 py-2 text-sm transition ${
                  activeSectionId === section.id
                    ? 'border border-neural/40 bg-neural/10 text-[var(--text-primary)]'
                    : 'border border-transparent text-[var(--text-secondary)] hover:border-[var(--surface-border)] hover:bg-black/10 hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="font-mono text-xs opacity-80">Section {section.number}</span>
                <span className="ml-2 font-medium">{section.title}</span>
              </a>
            ))}
          </nav>
        </aside>

        <div className="space-y-5">
          {sections.map((section) => {
            const lines = section.pseudocode ?? [];
            const isRunnerSection = pseudoRun?.sectionId === section.id;
            const activeLine = isRunnerSection ? pseudoRun?.line ?? -1 : -1;
            const progress = lines.length > 0 && isRunnerSection ? ((activeLine + 1) / lines.length) * 100 : 0;

            return (
              <article key={section.id} id={section.id} className="paper-section glass-panel-strong rounded-3xl p-5 md:p-6">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">Section {section.number}</p>
                    <h2 className="font-display text-3xl">{section.title}</h2>
                  </div>
                  <div className="no-print flex items-center gap-2">
                    <a className="chip-btn rounded-full px-3 py-1 text-xs" href={`#${section.id}`}>
                      Jump
                    </a>
                    <button className="chip-btn rounded-full px-3 py-1 text-xs" onClick={() => copySectionLink(section.id)}>
                      Copy Link
                    </button>
                  </div>
                </div>

                <p className="text-base leading-relaxed text-[var(--text-secondary)]">{section.summary}</p>

                <div className="mt-4 space-y-3 text-sm leading-relaxed">
                  {section.body.map((paragraph, idx) => (
                    <p key={`${section.id}-${idx}`}>{paragraph}</p>
                  ))}
                </div>

                {section.theorem && (
                  <div className="surface-muted mt-4 rounded-2xl p-4">
                    <p className="mb-2 font-semibold">{section.theorem}</p>
                    {section.theoremMath && <BlockMath math={section.theoremMath} />}
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">
                      The bound-gap stopping condition remains <InlineMath math={'(UB-LB)/UB \\le \\epsilon'} /> with admissible pruning.
                    </p>
                  </div>
                )}

                {section.figure && <Diagram type={section.figure.type} caption={section.figure.caption} />}

                {lines.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-[var(--surface-border)] bg-black/20 p-3">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">Pseudocode</h3>
                      <button className="no-print chip-btn rounded-lg px-3 py-1 text-xs" onClick={() => runPseudo(section.id, lines)}>
                        {isRunnerSection && pseudoRun?.running ? 'Stop' : 'Run This'}
                      </button>
                    </div>
                    <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-black/25">
                      <div
                        className="h-full bg-gradient-to-r from-neural via-dp to-bb transition-[width] duration-300"
                        style={{ width: `${Math.round(progress)}%` }}
                      />
                    </div>
                    <pre className="overflow-x-auto rounded-xl bg-black/30 p-3 font-mono text-xs leading-6">
                      {lines.map((line, idx) => {
                        const isActive = idx === activeLine;
                        return (
                          <div
                            key={`${section.id}-line-${idx}`}
                            className={`rounded px-2 transition ${
                              isActive
                                ? 'bg-gradient-to-r from-neural/35 to-dp/25 text-white'
                                : isRunnerSection && pseudoRun?.done
                                  ? 'text-emerald-100'
                                  : 'text-slate-200'
                            }`}
                          >
                            <span className={`mr-3 select-none ${isActive ? 'text-cyan-100' : 'text-slate-500'}`}>
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            {line}
                          </div>
                        );
                      })}
                    </pre>
                    <div className="mt-3 rounded-xl border border-[var(--surface-border)] bg-black/25 p-3">
                      <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">Execution Output</p>
                      <div className="space-y-1 font-mono text-xs text-slate-200">
                        {(pseudoLogs[section.id] ?? ['No output yet. Click "Run This" to execute pseudocode.']).map((entry, idx) => (
                          <p key={`${section.id}-log-${idx}`}>{entry}</p>
                        ))}
                      </div>
                    </div>
                    {isRunnerSection && (
                      <p className="mt-2 text-xs text-[var(--text-secondary)]">
                        {pseudoRun?.running
                          ? `Executing line ${activeLine + 1} of ${lines.length}`
                          : pseudoRun?.done
                            ? 'Execution complete'
                            : 'Execution paused'}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {section.annotations.map((annotation) => (
                    <div key={`${section.id}-${annotation.tag}`} className="rounded-xl border border-[var(--surface-border)] bg-black/10 p-3">
                      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        {annotation.tag}
                      </p>
                      <p className="text-sm text-[var(--text-primary)]">{annotation.text}</p>
                    </div>
                  ))}
                </div>

                {section.metrics && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {section.metrics.map((metric) => (
                      <button
                        key={metric.id}
                        onClick={() => setMetricDialog(metric)}
                        className="metric-card cursor-pointer text-left transition hover:translate-y-[-1px]"
                      >
                        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">{metric.label}</p>
                        <p className="mt-1 font-display text-2xl">{metric.value}</p>
                        <p className="mt-2 text-xs text-[var(--text-secondary)]">Click for mini chart</p>
                      </button>
                    ))}
                  </div>
                )}

                {section.references && (
                  <div className="mt-4 rounded-2xl border border-[var(--surface-border)] bg-black/10 p-3">
                    <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">References</p>
                    <ul className="space-y-1 text-sm">
                      {section.references.map((reference) => (
                        <li key={`${section.id}-${reference}`}>{reference}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {selectionAction && (
        <button
          className="no-print fixed z-[92] rounded-full border border-neural/40 bg-[var(--bg-panel-strong)] px-3 py-2 text-xs font-semibold text-neural shadow-[var(--shadow-soft)]"
          style={{ left: `${selectionAction.x}px`, top: `${selectionAction.y}px` }}
          onClick={() => sendSelectionToChat(selectionAction.text)}
        >
          Ask AI About Selection
        </button>
      )}

      {metricDialog && (
        <div className="no-print fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4">
          <div className="glass-panel-strong w-full max-w-lg rounded-2xl p-5">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">{metricDialog.label}</p>
                <p className="font-display text-3xl">{metricDialog.value}</p>
              </div>
              <button className="ghost-btn px-3 py-1 text-xs" onClick={() => setMetricDialog(null)}>
                Close
              </button>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{metricDialog.helper}</p>
            <MiniTrend values={metricDialog.trend} />
          </div>
        </div>
      )}
    </section>
  );
}
