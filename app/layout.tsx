import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { SiteUtilities } from '@/components/site-utilities';
import { getAppOrigin } from '@/lib/env';
import './globals.css';
import './future.css';
import './stitch.css';

const displayFont = Manrope({ subsets: ['latin'], variable: '--stitch-display', display: 'swap' });

const themeScript = `
  (() => {
    const saved = localStorage.getItem('myday-theme');
    document.documentElement.dataset.theme = saved === 'dark' ? 'dark' : 'light';
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
    <html lang="en" className={displayFont.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <SiteUtilities />
      </body>
    </html>
  );
}
