'use client';

import { useEffect, useMemo, useState } from 'react';
import type { HomeChapter } from '@/components/home/types';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getChapterProgress(chapters: HomeChapter[]) {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter-id]'));
  if (!sections.length) {
    return {
      activeId: chapters[0]?.id ?? 'topic-home',
      progress: 0,
    };
  }

  const anchor = window.innerHeight * 0.44;
  let activeNode: HTMLElement | null = null;
  let activeId = sections[0]?.dataset.chapterId ?? chapters[0]?.id ?? 'topic-home';
  let closestTopBelowAnchor = Number.NEGATIVE_INFINITY;
  let closestTopAboveAnchor = Number.POSITIVE_INFINITY;
  let fallbackAboveNode: HTMLElement | null = sections[0] ?? null;

  sections.forEach((section) => {
    const chapterId = section.dataset.chapterId;
    if (!chapterId) return;

    const top = section.getBoundingClientRect().top;
    if (top <= anchor && top > closestTopBelowAnchor) {
      closestTopBelowAnchor = top;
      activeId = chapterId;
      activeNode = section;
      return;
    }

    if (top > anchor && top < closestTopAboveAnchor) {
      closestTopAboveAnchor = top;
      fallbackAboveNode = section;
    }
  });

  if (closestTopBelowAnchor === Number.NEGATIVE_INFINITY) {
    activeNode = fallbackAboveNode;
    activeId = fallbackAboveNode?.dataset.chapterId ?? activeId;
  }

  const chapterIndex = Math.max(
    0,
    chapters.findIndex((chapter) => chapter.id === activeId),
  );
  const rect = activeNode?.getBoundingClientRect();
  const sectionHeight = Math.max(rect?.height ?? window.innerHeight, 1);
  const sectionProgress = rect ? clamp((anchor - rect.top) / sectionHeight, 0, 1) : 0;
  const progress = (chapterIndex + sectionProgress) / Math.max(chapters.length, 1);

  return {
    activeId,
    progress: clamp(progress, 0, 1),
  };
}

export function useHomeScrollState(chapters: HomeChapter[]) {
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState(chapters[0]?.id ?? 'topic-home');
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    const update = () => {
      const state = getChapterProgress(chapters);
      setProgress(state.progress);
      setActiveId(state.activeId);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [chapters]);

  return useMemo(
    () => ({
      progress,
      activeId,
      soundOn,
      setSoundOn,
    }),
    [activeId, progress, soundOn],
  );
}
