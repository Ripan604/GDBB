'use client';

import { useEffect, useMemo, useRef } from 'react';
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
  noise: AudioBufferSourceNode;
  shimmer: OscillatorNode;
  drones: OscillatorNode[];
  lfo: OscillatorNode;
  lfoGain: GainNode;
  shimmerTimer: number;
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
  master.connect(context.destination);

  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 980;
  filter.Q.value = 0.55;
  filter.connect(master);

  const droneA = context.createOscillator();
  droneA.type = 'sine';
  droneA.frequency.value = 130.81;
  const droneAGain = context.createGain();
  droneAGain.gain.value = 0.024;
  droneA.connect(droneAGain).connect(filter);

  const droneB = context.createOscillator();
  droneB.type = 'sine';
  droneB.frequency.value = 196;
  droneB.detune.value = -3;
  const droneBGain = context.createGain();
  droneBGain.gain.value = 0.018;
  droneB.connect(droneBGain).connect(filter);

  const droneC = context.createOscillator();
  droneC.type = 'triangle';
  droneC.frequency.value = 261.63;
  droneC.detune.value = 1.5;
  const droneCGain = context.createGain();
  droneCGain.gain.value = 0.012;
  droneC.connect(droneCGain).connect(filter);

  const droneD = context.createOscillator();
  droneD.type = 'sine';
  droneD.frequency.value = 329.63;
  droneD.detune.value = -2;
  const droneDGain = context.createGain();
  droneDGain.gain.value = 0.008;
  droneD.connect(droneDGain).connect(filter);

  const noiseFilter = context.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 520;
  noiseFilter.Q.value = 0.2;
  const noiseGain = context.createGain();
  noiseGain.gain.value = 0.01;
  noiseFilter.connect(noiseGain).connect(filter);

  const noise = context.createBufferSource();
  noise.buffer = createBrownNoiseBuffer(context, 2);
  noise.loop = true;
  noise.connect(noiseFilter);

  const lfo = context.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.034;
  const lfoGain = context.createGain();
  lfoGain.gain.value = 70;
  lfo.connect(lfoGain).connect(filter.frequency);

  const shimmer = context.createOscillator();
  shimmer.type = 'sine';
  shimmer.frequency.value = 392;
  const shimmerGain = context.createGain();
  shimmerGain.gain.value = 0;
  const shimmerFilter = context.createBiquadFilter();
  shimmerFilter.type = 'bandpass';
  shimmerFilter.frequency.value = 1300;
  shimmerFilter.Q.value = 0.6;
  shimmer.connect(shimmerGain).connect(shimmerFilter).connect(filter);

  const shimmerNotes = [392, 440, 523.25, 659.25, 523.25, 440];
  let shimmerStep = 0;
  const triggerShimmer = () => {
    const now = context.currentTime + 0.02;
    const note = shimmerNotes[shimmerStep % shimmerNotes.length] ?? 440;
    shimmerStep += 1;

    shimmer.frequency.cancelScheduledValues(now);
    shimmer.frequency.setValueAtTime(Math.max(220, shimmer.frequency.value), now);
    shimmer.frequency.exponentialRampToValueAtTime(note, now + 1.6);

    shimmerGain.gain.cancelScheduledValues(now);
    shimmerGain.gain.setValueAtTime(0.0001, now);
    shimmerGain.gain.linearRampToValueAtTime(0.02, now + 0.85);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0002, now + 4.6);
  };

  triggerShimmer();
  const shimmerTimer = window.setInterval(triggerShimmer, 5600) as unknown as number;

  droneA.start();
  droneB.start();
  droneC.start();
  droneD.start();
  noise.start();
  lfo.start();
  shimmer.start();

  return {
    context,
    master,
    filter,
    noise,
    shimmer,
    drones: [droneA, droneB, droneC, droneD],
    lfo,
    lfoGain,
    shimmerTimer,
  } satisfies AmbientGraph;
}

function stopAmbientGraph(graph: AmbientGraph) {
  const now = graph.context.currentTime;
  graph.master.gain.cancelScheduledValues(now);
  graph.master.gain.setTargetAtTime(0, now, 0.22);

  const closeAfterFadeMs = 550;
  window.setTimeout(() => {
    window.clearInterval(graph.shimmerTimer);
    graph.drones.forEach((osc) => {
      try {
        osc.stop();
      } catch {}
    });
    try {
      graph.shimmer.stop();
    } catch {}
    try {
      graph.noise.stop();
    } catch {}
    try {
      graph.lfo.stop();
    } catch {}
    void graph.context.close();
  }, closeAfterFadeMs);
}

export function HomeOverlay({ chapters, activeId, progress, soundOn, setSoundOn }: HomeOverlayProps) {
  const ambientRef = useRef<AmbientGraph | null>(null);
  const activeChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === activeId) ?? chapters[0],
    [activeId, chapters],
  );

  const progressLabel = useMemo(() => `${Math.round(progress * 100)}%`, [progress]);

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
    graph.master.gain.setTargetAtTime(0.075, now, 0.45);

    return () => {
      if (ambientRef.current) {
        stopAmbientGraph(ambientRef.current);
        ambientRef.current = null;
      }
    };
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

      <div className="absolute right-6 top-24 max-w-[268px] rounded-2xl border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-3 text-right font-mono text-[11px] tracking-[0.08em] text-[var(--text-secondary)]">
        <p className="text-xs tracking-[0.28em]">MANIFESTO</p>
        <p className="mt-2 leading-relaxed">
          Turn solver internals into visible behavior, so users can understand why optimization works, not just see final numbers.
        </p>
      </div>

      <div className="absolute left-1/2 top-24 -translate-x-1/2 rounded-full border border-[var(--surface-border-strong)] bg-[var(--bg-panel)] px-4 py-2 font-mono text-[11px] tracking-[0.18em] text-[var(--text-primary)]">
        {activeChapter?.code} | {activeChapter?.label} | {progressLabel}
      </div>

      <div className="absolute bottom-44 left-6 rounded-full border border-[var(--surface-border)] bg-[var(--bg-panel)] px-3 py-2 font-mono text-[10px] tracking-[0.12em] text-[var(--text-secondary)]">
        <p>Scroll to explore chapters.</p>
        <button
          type="button"
          onClick={() => setSoundOn((value) => !value)}
          className="pointer-events-auto mt-1 rounded-full border border-[var(--surface-border)] px-3 py-1 text-[10px] text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
        >
          Sound: {soundOn ? 'On' : 'Off'}
        </button>
      </div>
    </div>
  );
}
