'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Theme = 'light' | 'dark';

const navigation = [
  { href: '/', label: 'Calendar' },
  { href: '/explore', label: 'Explore' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/activity', label: 'Live feed' },
  { href: '/#how-it-works', label: 'How it works', anchor: true },
] as const;

function isCurrentPath(pathname: string, href: string) {
  const base = href.split('#')[0] || '/';
  return base === '/' ? pathname === '/' : pathname === base || pathname.startsWith(`${base}/`);
}

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>;
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [theme, setTheme] = useState<Theme | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    searchInput.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setSearchOpen(false); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [searchOpen]);

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('myday-theme', next);
    setTheme(next);
  }

  return (
    <header className="site-header future-header">
      <div className="shell future-header-inner">
        <a className="future-wordmark" href="/" aria-label="MYDAY home"><i /><span>MYDAY</span></a>

        <nav className="future-desktop-nav" aria-label="Primary navigation">
          {navigation.map((item) => {
            const active = !('anchor' in item) && isCurrentPath(pathname, item.href);
            return <a className={active ? 'is-active' : undefined} aria-current={active ? 'page' : undefined} href={item.href} key={item.href}>{item.label}</a>;
          })}
        </nav>

        <div className="future-header-actions">
          <button className="future-icon-button" type="button" aria-label="Search MYDAY" aria-expanded={searchOpen} onClick={() => setSearchOpen((open) => !open)}><SearchIcon /></button>
          <a className="future-header-claim" href="/claim">Claim a date <span>↗</span></a>
          <button className="future-avatar" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}><span>{theme === 'light' ? '☼' : '◐'}</span></button>
          <button className="future-menu-button" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><span>{menuOpen ? 'Close' : 'Menu'}</span><i aria-hidden="true" /></button>
        </div>
      </div>

      {searchOpen ? (
        <div className="future-search-panel">
          <form className="shell" action="/search" method="get">
            <SearchIcon /><label className="sr-only" htmlFor="header-search">Search dates, stories, or handles</label><input ref={searchInput} id="header-search" name="q" minLength={2} maxLength={100} placeholder="Search a date, story, or @handle" /><button type="submit">Search ↗</button><button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search">×</button>
          </form>
        </div>
      ) : null}

      {menuOpen ? (
        <nav className="future-mobile-nav" aria-label="Mobile navigation">
          {[...navigation, { href: '/trending', label: 'Trending' }, { href: '/search', label: 'Search' }].map((item, index) => <a href={item.href} aria-current={isCurrentPath(pathname, item.href) && !('anchor' in item) ? 'page' : undefined} onClick={() => setMenuOpen(false)} key={item.href}><span>0{index + 1}</span><strong>{item.label}</strong><b>↗</b></a>)}
          <a className="future-mobile-claim" href="/claim" onClick={() => setMenuOpen(false)}>Claim your date <b>↗</b></a>
        </nav>
      ) : null}
    </header>
  );
}
