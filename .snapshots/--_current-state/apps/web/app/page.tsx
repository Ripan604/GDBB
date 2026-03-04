'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GDBB_STATS } from '@/lib/gdbb-stats';
import { HomeOverlay } from '@/components/home/HomeOverlay';
import { useHomeScrollState } from '@/components/home/useHomeScrollState';
import type { HomeChapter } from '@/components/home/types';

const HOME_INITIAL_LOOP_COUNT = 6;
const HOME_MAX_LOOP_COUNT = 250;
const HOME_ANCHOR_LOOP_INDEX = 2;

const CHAPTERS: HomeChapter[] = [
  {
    id: 'topic-home',
    label: 'Home',
    code: 'PORTFOLIO_CO_00',
    title: 'A cinematic research platform for hybrid combinatorial optimization.',
    summary:
      'Scroll through repeating chapters, open any module instantly, and keep the igloo scene running continuously in the background.',
    facts: [
      `${GDBB_STATS.benchmark_instances} benchmark instances`,
      `${GDBB_STATS.avg_optimality_gap} average gap`,
      `${GDBB_STATS.nodes_pruned} nodes pruned`,
    ],
    route: '/',
  },
  {
    id: 'topic-explore',
    label: 'Explore',
    code: 'PORTFOLIO_CO_01',
    title: 'Inspect Greedy, DP, and B&B as one system.',
    summary:
      'See how each phase contributes and how Sigma guidance links construction, tightening, and pruning into one coherent runtime.',
    facts: ['Phase-level animation', 'Pseudocode sync', 'Complexity view'],
    route: '/explore',
  },
  {
    id: 'topic-vrp',
    label: 'CVRP Demo',
    code: 'PORTFOLIO_CO_02',
    title: 'Watch a live CVRP solve stream in real time.',
    summary:
      'Tune vehicle count, capacity, and epsilon; follow UB/LB/gap updates while Sigma snapshots and prune events are streamed.',
    facts: ['GREEDY -> DP -> BB', 'Bound telemetry', 'Sigma inspector'],
    route: '/demo/vrp',
  },
  {
    id: 'topic-theory',
    label: 'Theory',
    code: 'PORTFOLIO_CO_03',
    title: 'Formal guarantees with visual intuition.',
    summary:
      'Correctness, complexity, approximation, and convergence statements are paired with animations so each theorem is readable and concrete.',
    facts: ['KaTeX theorems', 'Proof walkthroughs', 'Visual mini-scenes'],
    route: '/theory',
  },
  {
    id: 'topic-benchmarks',
    label: 'Benchmarks',
    code: 'PORTFOLIO_CO_04',
    title: 'Evidence dashboard across domains.',
    summary:
      'Radar, scaling, ablation, and significance views summarize where GDBB wins and what each phase contributes quantitatively.',
    facts: ['Gap and speed', 'Ablation deltas', 'Leaderboard'],
    route: '/benchmarks',
  },
  {
    id: 'topic-chat',
    label: 'Chat',
    code: 'PORTFOLIO_CO_05',
    title: 'Ask the paper and get model-backed answers.',
    summary:
      'Use the assistant for theorem explanations, domain walkthroughs, and solver parameter guidance without leaving the experience.',
    facts: ['Streaming replies', 'Citations', 'Context by page'],
    route: '/chat',
  },
  {
    id: 'topic-paper',
    label: 'Paper',
    code: 'PORTFOLIO_CO_06',
    title: 'Read the manuscript with interactive context.',
    summary:
      'Section navigation, annotation blocks, pseudocode runs, and export options are available in a single structured reader.',
    facts: ['Section jump', 'Inline notes', 'Reader tools'],
    route: '/paper',
  },
  {
    id: 'topic-compare',
    label: 'Compare',
    code: 'PORTFOLIO_CO_07',
    title: 'Run head-to-head algorithm races.',
    summary:
      'Compare GDBB against baselines on identical instances and inspect quality-time tradeoffs with synchronized telemetry.',
    facts: ['Dual stream', 'Live race metrics', 'Result snapshots'],
    route: '/compare',
  },
  {
    id: 'topic-about',
    label: 'About',
    code: 'PORTFOLIO_CO_08',
    title: 'Mission, architecture, and roadmap.',
    summary:
      'Project scope, stack decisions, and phased execution from MVP to full v1 are captured in the project overview.',
    facts: ['Managed cloud stack', 'Monorepo architecture', 'Phased rollout'],
    route: '/about',
  },
];

function ChapterRail({
  activeId,
  onJump,
}: {
  activeId: string;
  onJump: (chapterId: string) => void;
}) {
  return (
    <aside className="no-print fixed right-4 top-[62%] z-30 hidden -translate-y-1/2 xl:block">
      <nav className="pointer-events-auto space-y-1 rounded-2xl border border-[var(--surface-border)] bg-[var(--bg-panel)] p-2 backdrop-blur-md">
        {CHAPTERS.map((chapter, index) => {
          const active = activeId === chapter.id;
          return (
            <button
              key={chapter.id}
              type="button"
              onClick={() => onJump(chapter.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] font-semibold tracking-[0.17em] transition ${
                active
                  ? 'bg-[var(--surface-muted)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--surface-border-strong)] text-[9px]">
                {(index + 1).toString().padStart(2, '0')}
              </span>
              {chapter.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function ChapterSection({
  chapter,
  intro = false,
  loopIndex,
  anchorLoopIndex,
  onJump,
}: {
  chapter: HomeChapter;
  intro?: boolean;
  loopIndex: number;
  anchorLoopIndex: number;
  onJump: (chapterId: string) => void;
}) {
  const sectionId = loopIndex === anchorLoopIndex ? chapter.id : undefined;

  return (
    <section
      id={sectionId}
      data-chapter-id={chapter.id}
      data-home-loop-index={loopIndex}
      className={`relative flex min-h-[100svh] scroll-mt-28 ${
        intro ? 'items-center pb-14 pt-36' : 'items-end pb-24 pt-24'
      }`}
    >
      <article className={`${intro ? 'intro-panel max-w-4xl' : 'ice-panel max-w-3xl'} rounded-3xl p-6 md:p-8`}>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">{chapter.code}</p>
        <h2 className="mt-4 font-display text-4xl leading-[1.04] text-[var(--text-primary)] md:text-6xl">{chapter.title}</h2>
        <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)] md:text-lg">{chapter.summary}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {chapter.facts.map((fact) => (
            <span
              key={fact}
              className="rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--text-primary)]"
            >
              {fact}
            </span>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={chapter.route} className="primary-btn">
            Open {chapter.label}
          </Link>
          <button type="button" onClick={() => onJump(chapter.id)} className="ghost-btn">
            Jump Link
          </button>
        </div>
      </article>
    </section>
  );
}

export default function HomePage() {
  const [loopCount, setLoopCount] = useState(HOME_INITIAL_LOOP_COUNT);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { activeId, progress, soundOn, setSoundOn } = useHomeScrollState(CHAPTERS);

  const handleChapterJump = useCallback((chapterId: string) => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(`[data-chapter-id="${chapterId}"]`));
    if (!sections.length) return;

    const anchor = window.innerHeight * 0.28;
    let target = sections[0] ?? null;
    if (!target) return;
    let bestDistance = Number.POSITIVE_INFINITY;
    sections.forEach((section) => {
      const distance = Math.abs(section.getBoundingClientRect().top - anchor);
      if (distance < bestDistance) {
        bestDistance = distance;
        target = section;
      }
    });

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries.some((entry) => entry.isIntersecting);
        if (!inView) return;
        setLoopCount((count) => Math.min(HOME_MAX_LOOP_COUNT, count + 2));
      },
      { rootMargin: '1400px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative -mx-4 px-4 lg:-mx-8 lg:px-8">
      <HomeOverlay chapters={CHAPTERS} activeId={activeId} progress={progress} soundOn={soundOn} setSoundOn={setSoundOn} />
      <ChapterRail activeId={activeId} onJump={handleChapterJump} />
      <div className="space-y-0">
        {Array.from({ length: loopCount }, (_, loopIndex) => (
          <div key={`home-loop-${loopIndex}`} data-home-loop data-home-loop-index={loopIndex}>
            {CHAPTERS.map((chapter, index) => (
              <ChapterSection
                key={`${loopIndex}-${chapter.id}`}
                chapter={chapter}
                intro={index === 0}
                loopIndex={loopIndex}
                anchorLoopIndex={HOME_ANCHOR_LOOP_INDEX}
                onJump={handleChapterJump}
              />
            ))}
          </div>
        ))}
      </div>
      <div ref={loadMoreRef} className="h-4" aria-hidden />
    </div>
  );
}
