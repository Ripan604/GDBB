'use client';

import { useEffect, useMemo, useState } from 'react';

const glyphFrames = ['---===+++', '--==++=--', '-==+==--=', '==+==--==', '=+===---+', '++==---=='];

export function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [frame, setFrame] = useState(0);
  const current = useMemo(() => glyphFrames[frame % glyphFrames.length] ?? glyphFrames[0], [frame]);

  useEffect(() => {
    const ticker = window.setInterval(() => {
      setFrame((value) => value + 1);
    }, 120);
    const timeout = window.setTimeout(() => {
      setVisible(false);
    }, 3000);

    return () => {
      window.clearInterval(ticker);
      window.clearTimeout(timeout);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[#aeb6c4]">
      <p className="font-mono text-sm tracking-[0.24em] text-white/95">{current}</p>
    </div>
  );
}
