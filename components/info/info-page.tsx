import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

export function InfoPage({ eyebrow, title, intro, updated, children }: { eyebrow: string; title: ReactNode; intro: string; updated?: string; children: ReactNode }) {
  return <><a className="skip-link" href="#main-content">Skip to content</a><SiteHeader /><main id="main-content" className="info-page shell"><header className="info-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{intro}</p>{updated ? <time dateTime="2026-08-25">Last updated {updated}</time> : null}</header><div className="info-content">{children}</div></main><SiteFooter /></>;
}
