import Link from 'next/link';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

type Section = 'overview' | 'dates' | 'settings' | 'notifications';
const links: Array<{ key: Section; href: string; label: string }> = [
  { key: 'overview', href: '/account', label: 'Overview' },
  { key: 'dates', href: '/account/dates', label: 'My dates' },
  { key: 'settings', href: '/account/settings', label: 'Profile settings' },
  { key: 'notifications', href: '/account/notifications', label: 'Notifications' },
];

export function AccountFrame({ section, username, children }: { section: Section; username: string; children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#account-content">Skip to account content</a>
      <SiteHeader />
      <div className="account-shell shell">
        <aside className="account-sidebar">
          <div><p className="eyebrow">Signed-in account</p><strong>@{username.replace(/^@/, '')}</strong></div>
          <nav aria-label="Account navigation">
            {links.map((link) => <Link className={link.key === section ? 'active' : ''} aria-current={link.key === section ? 'page' : undefined} href={link.href} key={link.key}>{link.label}<span aria-hidden="true">↗</span></Link>)}
          </nav>
          <Link className="button" href={`/@${username.replace(/^@/, '')}`}>View public profile</Link>
        </aside>
        <main id="account-content" className="account-content">{children}</main>
      </div>
      <SiteFooter />
    </>
  );
}
