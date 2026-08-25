'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AuthControls } from '@/components/auth/auth-controls';

type Theme = 'light' | 'dark';

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const firstMobileLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    firstMobileLink.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      requestAnimationFrame(() => menuButton.current?.focus());
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  function toggleTheme() {
    const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('myday-theme', next);
    setTheme(next);
  }

  function currentPageProps(href: string) {
    const isCurrent = isCurrentPath(pathname, href);

    return {
      className: isCurrent ? 'is-active' : undefined,
      'aria-current': isCurrent ? ('page' as const) : undefined,
    };
  }

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <a className="wordmark" href="/" aria-label="MYDAY home">
          MYDAY
        </a>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <a
            {...currentPageProps('/claim')}
            className={`nav-claim${isCurrentPath(pathname, '/claim') ? ' is-active' : ''}`}
            href="/claim"
          >
            Claim a date
          </a>
          <a {...currentPageProps('/explore')} href="/explore">Explore</a>
          <a {...currentPageProps('/leaderboard')} href="/leaderboard">Leaderboard</a>
          <a {...currentPageProps('/trending')} href="/trending">Trending</a>
          <a {...currentPageProps('/search')} href="/search">Search</a>
        </nav>

        <div className="header-actions">
          <AuthControls />
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            <span aria-hidden="true">{theme === 'dark' ? '◑' : '◐'}</span>
            <span>{theme === 'dark' ? 'Light' : theme === 'light' ? 'Dark' : 'Theme'}</span>
          </button>
          <button
            ref={menuButton}
            className="menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span>{menuOpen ? 'Close' : 'Menu'}</span>
            <span aria-hidden="true">{menuOpen ? '×' : '≡'}</span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav className="mobile-nav" id="mobile-menu" aria-label="Mobile navigation">
          <a {...currentPageProps('/claim')} ref={firstMobileLink} href="/claim" onClick={() => setMenuOpen(false)}>Claim a date</a>
          <a {...currentPageProps('/explore')} href="/explore" onClick={() => setMenuOpen(false)}>Explore</a>
          <a {...currentPageProps('/leaderboard')} href="/leaderboard" onClick={() => setMenuOpen(false)}>Leaderboard</a>
          <a {...currentPageProps('/trending')} href="/trending" onClick={() => setMenuOpen(false)}>Trending</a>
          <a {...currentPageProps('/activity')} href="/activity" onClick={() => setMenuOpen(false)}>Activity</a>
          <a {...currentPageProps('/search')} href="/search" onClick={() => setMenuOpen(false)}>Search</a>
          <a {...currentPageProps('/account')} href="/account" onClick={() => setMenuOpen(false)}>Account</a>
        </nav>
      ) : null}
    </header>
  );
}
