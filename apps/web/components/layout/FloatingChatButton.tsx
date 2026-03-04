'use client';

import { useUiStore } from '@/lib/store';

export function FloatingChatButton() {
  const setChatOpen = useUiStore((s) => s.setChatOpen);
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2">
      <button
        aria-label="Open command palette"
        onClick={() => setCommandOpen(true)}
        className="rounded-full border border-[var(--surface-border)] bg-[var(--bg-panel)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] backdrop-blur-md transition hover:border-[var(--surface-border-strong)]"
      >
        Ctrl+K
      </button>
      <button
        aria-label="Open AI assistant"
        onClick={() => setChatOpen(true)}
        className="flex items-center gap-2 rounded-full border border-[var(--surface-border-strong)] bg-[var(--bg-panel-strong)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] backdrop-blur-md transition hover:translate-y-[-1px] hover:border-[var(--text-primary)]"
      >
        <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--accent-sigma)]" />
        Ask AI
      </button>
    </div>
  );
}

