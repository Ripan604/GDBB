'use client';

import { useEffect } from 'react';
import { useUiStore } from '@/lib/store';

const toneClass: Record<string, string> = {
  info: 'border-neural/35 bg-neural/12',
  success: 'border-sigma/35 bg-sigma/12',
  warning: 'border-bb/35 bg-bb/12',
  error: 'border-red-400/45 bg-red-500/12',
};

export function ToastHub() {
  const toasts = useUiStore((state) => state.toasts);
  const removeToast = useUiStore((state) => state.removeToast);

  useEffect(() => {
    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        removeToast(toast.id);
      }, 4200),
    );
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [removeToast, toasts]);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[95] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-xl border p-3 shadow-[var(--shadow-soft)] backdrop-blur-md ${
            toneClass[toast.tone ?? 'info'] ?? toneClass.info
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{toast.title}</p>
              {toast.description && <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{toast.description}</p>}
            </div>
            <button className="rounded-full border border-[var(--surface-border)] px-2 py-1 text-[10px]" onClick={() => removeToast(toast.id)}>
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

