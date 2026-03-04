'use client';

import { create } from 'zustand';

type ThemeMode = 'dark' | 'light';
type ToastTone = 'info' | 'success' | 'warning' | 'error';

export type UiToast = {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
};

const THEME_STORAGE_KEY = 'gdbb-theme';

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return 'dark';
}

function applyTheme(theme: ThemeMode) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
}

type UiStore = {
  theme: ThemeMode;
  chatOpen: boolean;
  commandOpen: boolean;
  toasts: UiToast[];
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setChatOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  addToast: (toast: Omit<UiToast, 'id'>) => string;
  removeToast: (id: string) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  theme: readStoredTheme(),
  chatOpen: false,
  commandOpen: false,
  toasts: [],
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return { theme: next };
    }),
  setChatOpen: (chatOpen) => set({ chatOpen }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  addToast: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    return id;
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

