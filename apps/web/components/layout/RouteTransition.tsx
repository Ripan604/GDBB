'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export function RouteTransition() {
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 420);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-[85] transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(63,210,255,0.24),transparent_42%),radial-gradient(circle_at_80%_25%,rgba(125,143,255,0.18),transparent_34%),linear-gradient(180deg,rgba(4,9,16,0.16),rgba(4,9,16,0.06))]" />
    </div>
  );
}

