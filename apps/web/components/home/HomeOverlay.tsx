'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { HomeChapter } from '@/components/home/types';

type HomeOverlayProps = {
  chapters: HomeChapter[];
  activeId: string;
  progress: number;
  soundOn: boolean;
  setSoundOn: Dispatch<SetStateAction<boolean>>;
};

type AmbientGraph = {
  context: AudioContext;
  master: GainNode;
  filter: BiquadFilterNode;
  panner: StereoPannerNode | null;
  toneBus: GainNode;
  noiseGain: GainNode;
  padA: OscillatorNode;
  padB: OscillatorNode;
  padAGain: GainNode;
  padBGain: GainNode;
  noise: AudioBufferSourceNode;
  shimmer: OscillatorNode;
  shimmerGain: GainNode;
};

function createBrownNoiseBuffer(context: AudioContext, seconds = 2) {
  const length = context.sampleRate * seconds;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  return buffer;
}

function createAmbientGraph() {
  const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;

  const context = new AudioContextCtor();
  const master = context.createGain();
  master.gain.value = 0;
  const panner = typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
  if (panner) {
    panner.pan.value = 0;
    master.connect(panner);
    panner.connect(context.destination);
  } else {
    master.connect(context.destination);
  }

  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 540;
  filter.Q.value = 0.46;
  filter.connect(master);

  const toneBus = context.createGain();
  toneBus.gain.value = 0.95;
  toneBus.connect(filter);

  const padA = context.createOscillator();
  padA.type = 'triangle';
  padA.frequency.value = 123.47;
  const padAGain = context.createGain();
  padAGain.gain.value = 0.02;
  padA.connect(padAGain).connect(toneBus);

  const padB = context.createOscillator();
  padB.type = 'sine';
  padB.frequency.value = 185;
  padB.detune.value = -5;
  const padBGain = context.createGain();
  padBGain.gain.value = 0.015;
  padB.connect(padBGain).connect(toneBus);

  const noiseFilter = context.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 480;
  noiseFilter.Q.value = 0.18;
  const noiseGain = context.createGain();
  noiseGain.gain.value = 0.008;
  noiseFilter.connect(noiseGain).connect(toneBus);

  const noise = context.createBufferSource();
  noise.buffer = createBrownNoiseBuffer(context, 2);
  noise.loop = true;
  noise.connect(noiseFilter);

  const shimmer = context.createOscillator();
  shimmer.type = 'triangle';
  shimmer.frequency.value = 392;
  const shimmerGain = context.createGain();
  shimmerGain.gain.value = 0.0001;
  const shimmerFilter = context.createBiquadFilter();
  shimmerFilter.type = 'bandpass';
  shimmerFilter.frequency.value = 1260;
  shimmerFilter.Q.value = 0.8;
  shimmer.connect(shimmerGain).connect(shimmerFilter).connect(toneBus);

  padA.start();
  padB.start();
  noise.start();
  shimmer.start();

  return {
    context,
    master,
    filter,
    panner,
    toneBus,
    noiseGain,
    padA,
    padB,
    padAGain,
    padBGain,
    noise,
    shimmer,
    shimmerGain,
  } satisfies AmbientGraph;
}

function stopAmbientGraph(graph: AmbientGraph) {
  const now = graph.context.currentTime;
  graph.master.gain.cancelScheduledValues(now);
  graph.master.gain.setTargetAtTime(0, now, 0.22);

  const closeAfterFadeMs = 550;
  window.setTimeout(() => {
    try {
      graph.padA.stop();
    } catch {}
    try {
      graph.padB.stop();
    } catch {}
    try {
      graph.shimmer.stop();
    } catch {}
    try {
      graph.noise.stop();
    } catch {}
    void graph.context.close();
  }, closeAfterFadeMs);
}

export function HomeOverlay({ chapters, activeId, progress, soundOn, setSoundOn }: HomeOverlayProps) {
  const ambientRef = useRef<AmbientGraph | null>(null);
  const progressRef = useRef(progress);
  const audioMotionRef = useRef({
    x: 0,
    y: 0,
    speed: 0,
    lastX: 0,
    lastY: 0,
    lastT: 0,
    hoverTarget: 0,
    hover: 0,
    impulse: 0,
  });
  const [soundPanelExpanded, setSoundPanelExpanded] = useState(false);
  const activeChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === activeId) ?? chapters[0],
    [activeId, chapters],
  );

  const progressLabel = useMemo(() => `${Math.round(progress * 100)}%`, [progress]);
  const soundPanelSoft = progress < 0.58;

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const state = audioMotionRef.current;
      const nx = (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      const ny = 1 - (event.clientY / Math.max(1, window.innerHeight)) * 2;
      const now = performance.now();

      if (state.lastT > 0) {
        const dt = Math.max(12, now - state.lastT);
        const dx = nx - state.lastX;
        const dy = ny - state.lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const instant = dist / (dt / 16.6667);
        state.speed = Math.min(1.2, state.speed * 0.56 + instant * 0.44);
      }

      state.x = nx;
      state.y = ny;
      state.lastX = nx;
      state.lastY = ny;
      state.lastT = now;
    };

    const onIglooInteraction = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: 'hover' | 'burst'; active?: boolean; strength?: number }>).detail;
      if (!detail?.type) return;
      const state = audioMotionRef.current;
      if (detail.type === 'hover') {
        state.hoverTarget = detail.active ? 1 : 0;
      }
      if (detail.type === 'burst') {
        state.impulse = Math.min(2, state.impulse + (detail.strength ?? 1) * 0.42);
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('gdbb:igloo-interaction', onIglooInteraction as EventListener);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('gdbb:igloo-interaction', onIglooInteraction as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!soundOn) {
      if (ambientRef.current) {
        stopAmbientGraph(ambientRef.current);
        ambientRef.current = null;
      }
      return;
    }

    if (!ambientRef.current) {
      const graph = createAmbientGraph();
      if (!graph) return;
      ambientRef.current = graph;
    }

    const graph = ambientRef.current;
    if (!graph) return;

    void graph.context.resume();
    const now = graph.context.currentTime;
    graph.master.gain.cancelScheduledValues(now);
    graph.master.gain.setTargetAtTime(0.05, now, 0.45);

    return () => {
      if (ambientRef.current) {
        stopAmbientGraph(ambientRef.current);
        ambientRef.current = null;
      }
    };
  }, [soundOn]);

  useEffect(() => {
    if (!soundOn) return;

    let frame = 0;
    const tick = () => {
      const graph = ambientRef.current;
      if (!graph) {
        frame = window.requestAnimationFrame(tick);
        return;
      }

      const state = audioMotionRef.current;
      state.hover += (state.hoverTarget - state.hover) * 0.085;
      state.speed *= 0.9;
      state.impulse *= 0.9;

      const motion = Math.min(1.2, state.speed);
      const interaction = Math.min(1.6, state.hover + state.impulse);
      const scrollEnergy = 0.28 + progressRef.current * 0.55;
      const now = graph.context.currentTime;

      const masterTarget = 0.03 + motion * 0.024 + interaction * 0.014 + scrollEnergy * 0.012;
      graph.master.gain.setTargetAtTime(masterTarget, now, 0.18);
      graph.filter.frequency.setTargetAtTime(
        310 + (state.y + 1) * 170 + motion * 620 + interaction * 500 + progressRef.current * 240,
        now,
        0.16,
      );
      graph.noiseGain.gain.setTargetAtTime(0.004 + motion * 0.014 + state.hover * 0.011, now, 0.16);
      graph.padA.frequency.setTargetAtTime(112 + progressRef.current * 22 + state.x * 9 + state.hover * 6, now, 0.2);
      graph.padB.frequency.setTargetAtTime(172 + progressRef.current * 26 - state.x * 11 + state.hover * 7, now, 0.2);
      graph.padAGain.gain.setTargetAtTime(0.01 + scrollEnergy * 0.01 + motion * 0.006, now, 0.2);
      graph.padBGain.gain.setTargetAtTime(0.008 + scrollEnergy * 0.009 + motion * 0.006, now, 0.2);
      graph.shimmer.frequency.setTargetAtTime(420 + motion * 340 + interaction * 620 + (state.x + 1) * 80, now, 0.08);
      graph.shimmerGain.gain.setTargetAtTime(0.0001 + motion * 0.007 + state.hover * 0.01 + state.impulse * 0.014, now, 0.08);

      if (graph.panner) {
        graph.panner.pan.setTargetAtTime(state.x * 0.62, now, 0.18);
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [soundOn]);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 hidden lg:block">
      <div className="absolute left-6 top-28 max-w-[240px] font-mono text-[11px] tracking-[0.08em] text-[var(--text-secondary)]">
        <p className="font-display text-4xl font-bold leading-none tracking-[0.08em] text-[var(--text-primary)]">GDBB</p>
        <p className="mt-2">{'// Copyright (c) 2026'}</p>
        <p className="mt-2 leading-relaxed">
          GDBB Research Platform
          <br />
          Hybrid Optimization
          <br />
          Interactive Demonstrator
        </p>
      </div>

      <div className="absolute right-4 top-24 max-w-[268px] rounded-2xl border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-3 text-right font-mono text-[11px] tracking-[0.08em] text-[var(--text-secondary)]">
        <p className="text-xs tracking-[0.28em]">MANIFESTO</p>
        <p className="mt-2 leading-relaxed">
          Turn solver internals into visible behavior, so users can understand why optimization works, not just see final numbers.
        </p>
      </div>

      <div className="absolute left-1/2 top-24 -translate-x-1/2 rounded-full border border-[var(--surface-border-strong)] bg-[var(--bg-panel)] px-4 py-2 font-mono text-[11px] tracking-[0.18em] text-[var(--text-primary)]">
        {activeChapter?.code} | {activeChapter?.label} | {progressLabel}
      </div>

      <aside
        data-home-controls
        data-legend-blocker
        aria-label="Sound controls"
        aria-expanded={soundPanelExpanded}
        onMouseEnter={() => setSoundPanelExpanded(true)}
        onMouseLeave={() => setSoundPanelExpanded(false)}
        onFocusCapture={() => setSoundPanelExpanded(true)}
        onBlurCapture={() => setSoundPanelExpanded(false)}
        tabIndex={0}
        style={{ opacity: soundPanelExpanded ? 0.95 : soundPanelSoft ? 0.5 : 0.62 }}
        className={`pointer-events-auto absolute bottom-6 left-6 overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--bg-panel)] font-mono text-[10px] tracking-[0.12em] text-[var(--text-secondary)] outline-none transition-all duration-300 ${
          soundPanelExpanded ? 'w-[216px] px-3 py-2.5' : 'w-[56px] px-2.5 py-2'
        }`}
      >
        {soundPanelExpanded ? (
          <>
            <p>Scroll to explore chapters.</p>
            <button
              type="button"
              onClick={() => setSoundOn((value) => !value)}
              className="pointer-events-auto mt-1 rounded-full border border-[var(--surface-border)] px-3 py-1 text-[10px] text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
            >
              Sound: {soundOn ? 'On' : 'Off'}
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-0.5">
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">SND</span>
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: soundOn ? 'var(--accent-sigma)' : 'rgba(155, 173, 198, 0.68)' }}
            />
          </div>
        )}
      </aside>
    </div>
  );
}
