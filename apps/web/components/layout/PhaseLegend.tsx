'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const LEGEND_DEFAULT_BOTTOM = 16;
const LEGEND_BLOCKER_GAP = 24;
const LEGEND_MAX_BOTTOM = 280;
const HOME_FADE_VIEWPORT_RATIO = 0.58;

export function PhaseLegend() {
  const pathname = usePathname();
  const legendRef = useRef<HTMLElement>(null);
  const [bottomOffset, setBottomOffset] = useState(LEGEND_DEFAULT_BOTTOM);
  const [softOpacity, setSoftOpacity] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const updateLayout = () => {
      const onHome = pathname === '/';
      let nextBottom = LEGEND_DEFAULT_BOTTOM;
      let nextSoftOpacity = false;

      const blockers = Array.from(
        document.querySelectorAll<HTMLElement>('[data-legend-blocker], [data-home-controls]'),
      );
      blockers.forEach((blocker) => {
        const style = window.getComputedStyle(blocker);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        const rect = blocker.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        if (rect.top >= window.innerHeight) return;
        const requiredBottom = window.innerHeight - rect.top + LEGEND_BLOCKER_GAP;
        if (requiredBottom > nextBottom) {
          nextBottom = requiredBottom;
        }
      });

      nextBottom = Math.min(nextBottom, LEGEND_MAX_BOTTOM);

      if (onHome) {
        nextSoftOpacity = window.scrollY < window.innerHeight * HOME_FADE_VIEWPORT_RATIO;
      }

      setBottomOffset(nextBottom);
      setSoftOpacity(nextSoftOpacity);
    };

    updateLayout();
    window.addEventListener('scroll', updateLayout, { passive: true });
    window.addEventListener('resize', updateLayout);
    return () => {
      window.removeEventListener('scroll', updateLayout);
      window.removeEventListener('resize', updateLayout);
    };
  }, [pathname]);

  const showExpanded = expanded;

  return (
    <aside
      ref={legendRef}
      aria-label="Phase legend"
      aria-expanded={showExpanded}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocusCapture={() => setExpanded(true)}
      onBlurCapture={() => setExpanded(false)}
      tabIndex={0}
      style={{ bottom: `${bottomOffset}px` }}
      className={`glass-panel pointer-events-auto fixed left-6 z-40 hidden overflow-hidden rounded-2xl text-[11px] tracking-wide outline-none transition-all duration-300 md:block ${
        showExpanded
          ? 'w-[172px] p-3 opacity-95'
          : `w-[56px] p-2.5 ${softOpacity ? 'opacity-50' : 'opacity-62'}`
      }`}
    >
      {showExpanded ? (
        <div>
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
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 py-0.5">
          <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Phase</span>
          <span className="h-2 w-2 rounded-full bg-neural" />
          <span className="h-2 w-2 rounded-full bg-dp" />
          <span className="h-2 w-2 rounded-full bg-bb" />
          <span className="h-2 w-2 rounded-full bg-sigma" />
        </div>
      )}
    </aside>
  );
}
