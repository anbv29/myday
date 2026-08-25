export function SiteFooter() {
  return (
    <footer className="site-footer shell">
      <div>
        <a href="/" className="wordmark">MYDAY</a>
        <p>Every date means something to someone.</p>
      </div>
      <nav aria-label="Footer navigation">
        <a href="/faq">FAQ</a>
        <a href="/contact">Support</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/refunds">Refunds</a>
        <a href="/shipping">Delivery</a>
      </nav>
      <p>© {new Date().getUTCFullYear()} MYDAY</p>
    </footer>
  );
}
