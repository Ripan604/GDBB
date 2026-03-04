'use client';

import { useEffect } from 'react';
import { LoadingScreen } from '@/components/layout/LoadingScreen';
import { ChatDrawer } from '@/components/chat/ChatDrawer';
import { GlobalBackground3D } from '@/components/layout/GlobalBackground3D';
import { useUiStore } from '@/lib/store';

export function Providers({ children }: { children: React.ReactNode }) {
  const setTheme = useUiStore((s) => s.setTheme);

  useEffect(() => {
    setTheme('dark');
  }, [setTheme]);

  return (
    <>
      <GlobalBackground3D />
      <LoadingScreen />
      {children}
      <ChatDrawer />
    </>
  );
}

