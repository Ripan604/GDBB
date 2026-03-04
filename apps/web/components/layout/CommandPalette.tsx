'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';
import { useUiStore } from '@/lib/store';

type PaletteItem = {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
};

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const commandOpen = useUiStore((state) => state.commandOpen);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const setChatOpen = useUiStore((state) => state.setChatOpen);
  const addToast = useUiStore((state) => state.addToast);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo<PaletteItem[]>(
    () => [
      ...NAV_ITEMS.map((item) => ({
        id: `route-${item.href}`,
        label: `Go to ${item.label}`,
        hint: item.href,
        run: () => {
          router.push(item.href);
          setCommandOpen(false);
        },
      })),
      {
        id: 'action-chat',
        label: 'Open AI Assistant',
        hint: 'chat drawer',
        run: () => {
          setChatOpen(true);
          setCommandOpen(false);
        },
      },
      {
        id: 'action-theme',
        label: 'Toggle theme',
        hint: 'dark / light',
        run: () => {
          toggleTheme();
          addToast({ title: 'Theme toggled', tone: 'success' });
          setCommandOpen(false);
        },
      },
      {
        id: 'action-copy-url',
        label: 'Copy current page URL',
        hint: pathname,
        run: async () => {
          const url = window.location.href;
          try {
            await navigator.clipboard.writeText(url);
            addToast({ title: 'URL copied', description: url, tone: 'success' });
          } catch {
            addToast({ title: 'Copy failed', tone: 'error' });
          } finally {
            setCommandOpen(false);
          }
        },
      },
    ],
    [addToast, pathname, router, setChatOpen, setCommandOpen, toggleTheme],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.label} ${item.hint ?? ''}`.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(!commandOpen);
      }
      if (!commandOpen) return;
      if (event.key === 'Escape') {
        setCommandOpen(false);
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) => Math.min(filtered.length - 1, prev + 1));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) => Math.max(0, prev - 1));
      }
      if (event.key === 'Enter') {
        const candidate = filtered[activeIndex];
        if (candidate) {
          event.preventDefault();
          candidate.run();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, commandOpen, filtered, setCommandOpen]);

  useEffect(() => {
    if (!commandOpen) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [commandOpen]);

  if (!commandOpen) return null;

  return (
    <div className="fixed inset-0 z-[98] flex items-start justify-center bg-black/40 px-4 pt-24 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--surface-border-strong)] bg-[var(--bg-panel-strong)] p-3 shadow-[var(--shadow-soft)]">
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          className="input-shell w-full rounded-xl px-3 py-2.5 text-sm outline-none ring-neural/30 focus:ring-2"
          placeholder="Type a page or action... (Ctrl/Cmd + K)"
        />
        <div className="mt-3 max-h-[56vh] overflow-auto">
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3 text-sm text-[var(--text-secondary)]">
              No matching actions.
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((item, index) => (
                <button
                  key={item.id}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                    index === activeIndex
                      ? 'border-neural/35 bg-neural/12 text-[var(--text-primary)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--surface-border)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]'
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={item.run}
                >
                  <span>{item.label}</span>
                  {item.hint && <span className="font-mono text-[11px] uppercase tracking-[0.12em] opacity-80">{item.hint}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

