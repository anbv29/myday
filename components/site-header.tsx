'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  const searchTrigger = useRef<HTMLButtonElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const mobileNav = useRef<HTMLElement>(null);
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    searchTrigger.current?.focus();
  }, []);
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    menuTrigger.current?.focus();
  }, []);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (searchOpen) closeSearch();
        else setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, [searchOpen, closeSearch]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    searchInput.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') closeSearch(); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [searchOpen, closeSearch]);

  useEffect(() => {
    if (!menuOpen) return;
    mobileNav.current?.querySelector('a')?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') closeMenu(); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [menuOpen, closeMenu]);

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
          <button ref={searchTrigger} className="future-icon-button" type="button" aria-label="Search MYDAY" aria-expanded={searchOpen} onClick={() => searchOpen ? closeSearch() : setSearchOpen(true)}><SearchIcon /></button>
          <a className="future-header-claim" href="/claim">Claim a date <span>↗</span></a>
          <button className="future-avatar" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{theme === 'dark' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19" /></> : <path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10Z" />}</svg></button>
          <button ref={menuTrigger} className="future-menu-button" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => menuOpen ? closeMenu() : setMenuOpen(true)}><span>{menuOpen ? 'Close' : 'Menu'}</span><i aria-hidden="true" /></button>
        </div>
      </div>

      {searchOpen ? (
        <div className="future-search-panel">
          <form className="shell" action="/search" method="get">
            <SearchIcon /><label className="sr-only" htmlFor="header-search">Search dates, stories, or handles</label><input ref={searchInput} id="header-search" name="q" minLength={2} maxLength={100} placeholder="Search a date, story, or @handle" /><button type="submit">Search</button><button type="button" onClick={closeSearch} aria-label="Close search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button>
          </form>
        </div>
      ) : null}

      {menuOpen ? (
        <nav ref={mobileNav} className="future-mobile-nav" aria-label="Mobile navigation">
          {[...navigation, { href: '/trending', label: 'Trending' }, { href: '/search', label: 'Search' }].map((item, index) => <a href={item.href} aria-current={isCurrentPath(pathname, item.href) && !('anchor' in item) ? 'page' : undefined} onClick={() => setMenuOpen(false)} key={item.href}><span>0{index + 1}</span><strong>{item.label}</strong><b>↗</b></a>)}
          <a className="future-mobile-claim" href="/claim" onClick={() => setMenuOpen(false)}>Claim your date <b>↗</b></a>
        </nav>
      ) : null}
    </header>
  );
}
