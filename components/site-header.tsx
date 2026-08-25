'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthControls } from '@/components/auth/auth-controls';

type Theme = 'light' | 'dark';

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme | null>(null);

  function toggleTheme() {
    const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('myday-theme', next);
    setTheme(next);
  }

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="wordmark" href="/" aria-label="MYDAY.LOL home">
          MYDAY<span>.</span>LOL
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <Link href="/#leaderboard">Leaderboard</Link>
          <Link href="/#how-it-works">How it works</Link>
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
          <Link href="/#leaderboard" onClick={() => setMenuOpen(false)}>Leaderboard</Link>
          <Link href="/#how-it-works" onClick={() => setMenuOpen(false)}>How it works</Link>
          <Link href="/onboarding/username" onClick={() => setMenuOpen(false)}>Account</Link>
        </nav>
      ) : null}
    </header>
  );
}
