'use client';

import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';
import { useUiStore } from '@/lib/store';

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

export function Navbar() {
  const pathname = usePathname();
  const onHome = pathname === '/';
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const theme = useUiStore((s) => s.theme);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeHomeSection, setActiveHomeSection] = useState('topic-home');

  const sectionIds = useMemo(() => NAV_ITEMS.map((item) => item.sectionId), []);

  useEffect(() => {
    if (!onHome) return;

    const updateActive = () => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter-id]'));
      if (!sections.length) {
        setActiveHomeSection(sectionIds[0] ?? 'topic-home');
        return;
      }

      const anchor = window.innerHeight * 0.26;
      let active = sections[0]?.dataset.chapterId ?? sectionIds[0] ?? 'topic-home';
      let bestTop = Number.NEGATIVE_INFINITY;

      sections.forEach((section) => {
        const id = section.dataset.chapterId;
        if (!id) return;
        const top = section.getBoundingClientRect().top;
        if (top <= anchor && top > bestTop) {
          bestTop = top;
          active = id;
        }
      });

      setActiveHomeSection(active);
    };

    updateActive();
    window.addEventListener('scroll', updateActive, { passive: true });
    window.addEventListener('resize', updateActive);

    return () => {
      window.removeEventListener('scroll', updateActive);
      window.removeEventListener('resize', updateActive);
    };
  }, [onHome, sectionIds]);

  const handleTopicJump = (sectionId: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onHome) return;
    event.preventDefault();

    const sections = Array.from(document.querySelectorAll<HTMLElement>(`[data-chapter-id="${sectionId}"]`));
    if (!sections.length) return;
    const anchor = window.innerHeight * 0.24;
    let target = sections[0] ?? null;
    if (!target) return;
    let best = Number.POSITIVE_INFINITY;
    sections.forEach((section) => {
      const distance = Math.abs(section.getBoundingClientRect().top - anchor);
      if (distance < best) {
        best = distance;
        target = section;
      }
    });

    window.history.replaceState(null, '', `/#${sectionId}`);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileOpen(false);
  };

  const itemIsActive = (href: string, sectionId: string) => {
    if (onHome) {
      return activeHomeSection === sectionId;
    }
    return isActive(pathname, href);
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-4 py-3 lg:px-8">
      <nav
        className="glass-panel-strong nav-shell mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-4 py-3"
      >
        <Link
          href="/"
          className="font-display text-xl font-bold tracking-[0.14em] text-[var(--text-primary)]"
        >
          GDBB
        </Link>
        <ul className="hidden items-center gap-2 xl:flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={onHome ? `/#${item.sectionId}` : item.href}
                onClick={handleTopicJump(item.sectionId)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  itemIsActive(item.href, item.sectionId)
                    ? 'bg-[var(--surface-muted)] text-[var(--text-primary)] ring-1 ring-[var(--surface-border-strong)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <button
            aria-label="Toggle dark and light mode"
            onClick={toggleTheme}
            className="rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--surface-border-strong)] hover:bg-white/10"
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button
            aria-label="Toggle navigation menu"
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--surface-border-strong)] hover:bg-white/10 xl:hidden"
          >
            Menu
          </button>
        </div>
      </nav>
      {mobileOpen && (
        <div className="glass-panel-strong mx-auto mt-2 max-w-7xl rounded-2xl p-3 xl:hidden">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={onHome ? `/#${item.sectionId}` : item.href}
                  onClick={(event) => {
                    handleTopicJump(item.sectionId)(event);
                    if (!onHome) setMobileOpen(false);
                  }}
                  className={`block rounded-xl px-3 py-2 text-sm ${
                    itemIsActive(item.href, item.sectionId)
                      ? 'bg-[var(--surface-muted)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}

