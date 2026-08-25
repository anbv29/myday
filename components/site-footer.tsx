import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer shell">
      <Link href="/" className="wordmark">MYDAY.LOL</Link>
      <p>Every date means something to someone.</p>
      <p>© {new Date().getUTCFullYear()} MYDAY.LOL</p>
    </footer>
  );
}
