import type { Metadata } from 'next';
import { AppAuthProvider } from '@/components/auth/app-auth-provider';
import './globals.css';

const themeScript = `
  (() => {
    const saved = localStorage.getItem('myday-theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = saved || (systemDark ? 'dark' : 'light');
  })();
`;

export const metadata: Metadata = {
  title: {
    default: 'MYDAY.LOL — Make a date matter',
    template: '%s — MYDAY.LOL',
  },
  description:
    'A public leaderboard of the dates people decided mattered enough to claim.',
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
      <body><AppAuthProvider>{children}</AppAuthProvider></body>
    </html>
  );
}
