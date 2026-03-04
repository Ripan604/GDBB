'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { SolveEvent } from '@gdbb/contracts';

type SseState = {
  events: SolveEvent[];
  error?: string;
  complete: boolean;
};

function parseSseChunk(chunk: string): SolveEvent[] {
  const blocks = chunk.split('\n\n');
  const events: SolveEvent[] = [];

  for (const block of blocks) {
    const dataLine = block
      .split('\n')
      .find((line) => line.startsWith('data:'))
      ?.slice(5)
      .trim();

    if (!dataLine) continue;

    try {
      events.push(JSON.parse(dataLine) as SolveEvent);
    } catch {
      // ignore non-json lines
    }
  }

  return events;
}

export function useSSE(url: string | null, body: object | null, enabled = true) {
  const [state, setState] = useState<SseState>({ events: [], complete: false });
  const abortRef = useRef<AbortController | null>(null);

  const bodyJson = useMemo(() => (body ? JSON.stringify(body) : null), [body]);

  useEffect(() => {
    if (!url || !bodyJson || !enabled) return;

    const controller = new AbortController();
    abortRef.current = controller;
    let done = false;
    let buffer = '';
    setState({ events: [], complete: false });

    (async () => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: bodyJson,
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`SSE request failed with status ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const boundary = buffer.lastIndexOf('\n\n');
            if (boundary === -1) continue;
            const ready = buffer.slice(0, boundary + 2);
            buffer = buffer.slice(boundary + 2);
            const parsed = parseSseChunk(ready);
            if (parsed.length) {
              setState((prev) => ({
                ...prev,
                events: [...prev.events, ...parsed],
                complete: prev.complete || parsed.some((e) => e.type === 'complete'),
              }));
            }
          }
        }

        if (buffer.trim()) {
          const parsed = parseSseChunk(buffer);
          if (parsed.length) {
            setState((prev) => ({
              ...prev,
              events: [...prev.events, ...parsed],
              complete: prev.complete || parsed.some((e) => e.type === 'complete'),
            }));
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown SSE error';
        setState((prev) => ({ ...prev, error: message }));
      }
    })();

    return () => {
      done = true;
      controller.abort();
    };
  }, [url, bodyJson, enabled]);

  const reset = () => {
    abortRef.current?.abort();
    setState({ events: [], complete: false });
  };

  return { ...state, reset };
}

