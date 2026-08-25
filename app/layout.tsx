import type { Metadata } from 'next';
import { AppAuthProvider } from '@/components/auth/app-auth-provider';
import { SiteUtilities } from '@/components/site-utilities';
import { getAppOrigin } from '@/lib/env';
import './globals.css';

const themeScript = `
  (() => {
    const saved = localStorage.getItem('myday-theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = saved || (systemDark ? 'dark' : 'light');
  })();
`;

export const metadata: Metadata = {
  metadataBase: new URL(getAppOrigin()),
  title: {
    default: 'MYDAY — Make a date matter',
    template: '%s — MYDAY',
  },
  description:
    'A public leaderboard of the dates people decided mattered enough to claim.',
  openGraph: {
    siteName: 'MYDAY',
    type: 'website',
    title: 'MYDAY — Make a date matter',
    description: 'A public leaderboard of the dates people decided mattered enough to claim.',
    images: [{
      url: '/og.png',
      width: 1732,
      height: 909,
      alt: 'MYDAY — Make a date matter.',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MYDAY — Make a date matter',
    description: 'A public leaderboard of the dates people decided mattered enough to claim.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppAuthProvider>{children}</AppAuthProvider>
        <SiteUtilities />
      </body>
    </html>
  );
}
