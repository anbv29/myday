import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer shell">
      <div>
        <Link href="/" className="wordmark">MYDAY.LOL</Link>
        <p>Every date means something to someone.</p>
      </div>
      <nav aria-label="Footer navigation">
        <Link href="/faq">FAQ</Link>
        <Link href="/contact">Support</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/refunds">Refunds</Link>
        <Link href="/shipping">Delivery</Link>
      </nav>
      <p>© {new Date().getUTCFullYear()} MYDAY.LOL</p>
    </footer>
  );
}
