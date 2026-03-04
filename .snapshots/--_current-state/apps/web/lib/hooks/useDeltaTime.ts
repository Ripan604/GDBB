'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export function useDeltaTime(onTick: (deltaSeconds: number, elapsedSeconds: number) => void) {
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    const normalizedDelta = Math.min(delta, 1 / 30);
    elapsed.current += normalizedDelta;
    onTick(normalizedDelta, elapsed.current);
  });
}

