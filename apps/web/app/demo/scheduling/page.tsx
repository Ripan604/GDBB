'use client';

import { useMemo, useState } from 'react';

type Job = {
  id: string;
  specialty: 'cardiology' | 'neurology' | 'orthopedic' | 'oncology';
  room: number;
  start: number;
  duration: number;
  intensity: number;
};

const specialtyColor: Record<Job['specialty'], string> = {
  cardiology: '#ff7f67',
  neurology: '#6bb9ff',
  orthopedic: '#9d8dff',
  oncology: '#53d7ad',
};

const initialJobs: Job[] = [
  { id: 'S-101', specialty: 'cardiology', room: 1, start: 8, duration: 2, intensity: 4 },
  { id: 'S-102', specialty: 'neurology', room: 1, start: 10.5, duration: 1.5, intensity: 3 },
  { id: 'S-211', specialty: 'orthopedic', room: 2, start: 8.5, duration: 3, intensity: 5 },
  { id: 'S-412', specialty: 'oncology', room: 3, start: 9, duration: 2.5, intensity: 4 },
  { id: 'S-223', specialty: 'cardiology', room: 2, start: 12, duration: 2, intensity: 4 },
  { id: 'S-539', specialty: 'neurology', room: 3, start: 12.3, duration: 1.2, intensity: 2 },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function SchedulingDemoPage() {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [bufferMinutes, setBufferMinutes] = useState(20);
  const [rooms, setRooms] = useState(4);
  const [surgeonLoad, setSurgeonLoad] = useState(78);

  const objectiveScore = useMemo(() => {
    const totalDuration = jobs.reduce((sum, job) => sum + job.duration, 0);
    const overlapPenalty = jobs.length * (bufferMinutes / 20) * 0.6;
    const utilizationPenalty = Math.max(0, surgeonLoad - 85) * 0.3;
    return Math.max(0, 100 - (totalDuration * 1.3 + overlapPenalty + utilizationPenalty));
  }, [bufferMinutes, jobs, surgeonLoad]);

  const roomLoad = useMemo(() => {
    return Array.from({ length: rooms }, (_, roomIdx) => {
      const roomId = roomIdx + 1;
      const roomJobs = jobs.filter((job) => job.room === roomId);
      const hours = roomJobs.reduce((sum, job) => sum + job.duration, 0);
      return { roomId, hours, jobs: roomJobs };
    });
  }, [jobs, rooms]);

  return (
    <section className="space-y-6 pb-8">
      <header className="glass-panel-strong rounded-3xl p-6">
        <span className="eyebrow">Live Demo - MRORS</span>
        <h1 className="section-title mt-3">Operating room schedule simulator with optimization-centric diagnostics.</h1>
        <p className="section-subtitle mt-3">
          Adjust constraints and inspect how schedule compactness, room load balancing, and resource pressure affect objective quality.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="glass-panel rounded-2xl p-4">
          <h2 className="mb-3 font-display text-2xl">Timeline Board</h2>
          <div className="space-y-3">
            {roomLoad.map((room) => (
              <div key={room.roomId} className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span className="uppercase tracking-[0.14em]">Room {room.roomId}</span>
                  <span>{room.hours.toFixed(1)} hrs scheduled</span>
                </div>
                <div className="relative h-16 rounded-lg border border-[var(--surface-border)] bg-black/25">
                  {room.jobs.map((job) => (
                    <button
                      key={job.id}
                      className="absolute top-2 rounded-md px-2 py-1 text-xs font-semibold text-black transition hover:brightness-110"
                      style={{
                        left: `${((job.start - 8) / 8) * 100}%`,
                        width: `${(job.duration / 8) * 100}%`,
                        background: specialtyColor[job.specialty],
                        height: `${16 + job.intensity * 6}px`,
                      }}
                      onClick={() => {
                        setJobs((prev) =>
                          prev.map((entry) =>
                            entry.id === job.id ? { ...entry, start: clamp(entry.start + 0.2, 8, 15.2) } : entry,
                          ),
                        );
                      }}
                    >
                      {job.id}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="glass-panel rounded-2xl p-4">
            <h2 className="font-display text-2xl">Constraint Console</h2>
            <div className="mt-3 space-y-3">
              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  <span>Buffer (minutes)</span>
                  <span>{bufferMinutes}</span>
                </div>
                <input
                  className="w-full"
                  type="range"
                  min={10}
                  max={60}
                  step={5}
                  value={bufferMinutes}
                  onChange={(event) => setBufferMinutes(Number(event.target.value))}
                />
              </label>
              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  <span>Rooms</span>
                  <span>{rooms}</span>
                </div>
                <input className="w-full" type="range" min={2} max={7} step={1} value={rooms} onChange={(event) => setRooms(Number(event.target.value))} />
              </label>
              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  <span>Surgeon load</span>
                  <span>{surgeonLoad}%</span>
                </div>
                <input
                  className="w-full"
                  type="range"
                  min={40}
                  max={110}
                  step={1}
                  value={surgeonLoad}
                  onChange={(event) => setSurgeonLoad(Number(event.target.value))}
                />
              </label>
            </div>
          </section>

          <section className="glass-panel rounded-2xl p-4">
            <h3 className="font-display text-xl">Optimization Outcome</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Objective score combines completion time, room contention, and resource strain.
            </p>
            <p className="mt-3 font-display text-4xl text-neural">{objectiveScore.toFixed(1)}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/20">
              <div className="h-full bg-gradient-to-r from-bb via-dp to-sigma" style={{ width: `${objectiveScore}%` }} />
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

