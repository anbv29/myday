'use client';

import Link from 'next/link';
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
        <Link className="wordmark" href="/" aria-label="MYDAY.LOL home">
          MYDAY<span>.</span>LOL
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <Link
            {...currentPageProps('/claim')}
            className={`nav-claim${isCurrentPath(pathname, '/claim') ? ' is-active' : ''}`}
            href="/claim"
          >
            Claim a date
          </Link>
          <Link {...currentPageProps('/explore')} href="/explore">Explore</Link>
          <Link {...currentPageProps('/leaderboard')} href="/leaderboard">Leaderboard</Link>
          <Link {...currentPageProps('/trending')} href="/trending">Trending</Link>
          <Link {...currentPageProps('/search')} href="/search">Search</Link>
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
          <Link {...currentPageProps('/claim')} ref={firstMobileLink} href="/claim" onClick={() => setMenuOpen(false)}>Claim a date</Link>
          <Link {...currentPageProps('/explore')} href="/explore" onClick={() => setMenuOpen(false)}>Explore</Link>
          <Link {...currentPageProps('/leaderboard')} href="/leaderboard" onClick={() => setMenuOpen(false)}>Leaderboard</Link>
          <Link {...currentPageProps('/trending')} href="/trending" onClick={() => setMenuOpen(false)}>Trending</Link>
          <Link {...currentPageProps('/activity')} href="/activity" onClick={() => setMenuOpen(false)}>Activity</Link>
          <Link {...currentPageProps('/search')} href="/search" onClick={() => setMenuOpen(false)}>Search</Link>
          <Link {...currentPageProps('/account')} href="/account" onClick={() => setMenuOpen(false)}>Account</Link>
        </nav>
      ) : null}
    </header>
  );
}
