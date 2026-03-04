'use client';

import { useEffect } from 'react';
import { LoadingScreen } from '@/components/layout/LoadingScreen';
import { ChatDrawer } from '@/components/chat/ChatDrawer';
import { GlobalBackground3D } from '@/components/layout/GlobalBackground3D';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { RouteTransition } from '@/components/layout/RouteTransition';
import { ToastHub } from '@/components/layout/ToastHub';
import { useUiStore } from '@/lib/store';

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      <GlobalBackground3D />
      <RouteTransition />
      <LoadingScreen />
      {children}
      <ChatDrawer />
      <CommandPalette />
      <ToastHub />
    </>
  );
}

