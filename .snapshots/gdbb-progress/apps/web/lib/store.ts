'use client';

import { create } from 'zustand';

type ThemeMode = 'dark' | 'light';

type UiStore = {
  theme: ThemeMode;
  chatOpen: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setChatOpen: (open: boolean) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  theme: 'dark',
  chatOpen: false,
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      return { theme: next };
    }),
  setChatOpen: (chatOpen) => set({ chatOpen }),
}));

