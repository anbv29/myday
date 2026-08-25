import type { ReactNode } from 'react';
import { DataSourceRibbon } from '@/components/public/data-state';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import type { PublicDataSource } from '@/lib/public/types';

export function PublicPage({
  source,
  children,
  mainClassName = 'discovery-page shell',
}: {
  source: PublicDataSource;
  children: ReactNode;
  mainClassName?: string;
}) {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <DataSourceRibbon source={source} />
      <SiteHeader />
      <main id="main-content" className={mainClassName}>{children}</main>
      <SiteFooter />
    </>
  );
}
