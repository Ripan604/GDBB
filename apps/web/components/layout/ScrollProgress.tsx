'use client';

import { useEffect, useState } from 'react';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      let ratio = total > 0 ? doc.scrollTop / total : 0;

      if (typeof window !== 'undefined' && window.location.pathname === '/') {
        const loops = document.querySelectorAll<HTMLElement>('[data-home-loop]');
        if (loops.length > 0) {
          const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter-id]'));
          const chapterIds = Array.from(
            new Set(
              sections
                .map((section) => section.dataset.chapterId)
                .filter((id): id is string => typeof id === 'string' && id.length > 0),
            ),
          );

          if (sections.length > 0 && chapterIds.length > 0) {
            const anchor = window.innerHeight * 0.16;
            let activeNode: HTMLElement | null = sections[0] ?? null;
            if (!activeNode) {
              setProgress(Math.max(0, Math.min(1, ratio)));
              return;
            }
            let bestTop = Number.NEGATIVE_INFINITY;
            sections.forEach((section) => {
              const top = section.getBoundingClientRect().top;
              if (top <= anchor && top > bestTop) {
                bestTop = top;
                activeNode = section;
              }
            });

            const activeId = activeNode.dataset.chapterId ?? (chapterIds[0] ?? 'topic-home');
            const activeIndex = Math.max(0, chapterIds.indexOf(activeId));
            const rect = activeNode.getBoundingClientRect();
            const sectionProgress = clamp((anchor - rect.top) / Math.max(rect.height, 1), 0, 1);
            ratio = (activeIndex + sectionProgress) / chapterIds.length;
          }
        }
      }

      setProgress(Math.max(0, Math.min(1, ratio)));
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed left-0 right-0 top-0 z-[60] h-[3px]" style={{ background: 'var(--progress-track)' }}>
      <div
        className="h-full transition-[width] duration-150"
        style={{
          width: `${progress * 100}%`,
          background: 'linear-gradient(90deg, var(--progress-start) 0%, var(--progress-mid) 52%, var(--progress-end) 100%)',
          boxShadow: '0 0 16px var(--progress-glow)',
        }}
      />
    </div>
  );
}

