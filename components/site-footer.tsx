export function SiteFooter() {
  return (
    <footer className="site-footer future-footer shell">
      <div className="future-footer-brand">
        <a href="/" className="future-wordmark"><i /><span>MYDAY</span></a>
        <p>A public market for the days people refuse to forget.</p>
      </div>
      <div className="future-footer-links">
        <nav aria-label="Product navigation"><strong>Product</strong><a href="/explore">Explore</a><a href="/leaderboard">Leaderboard</a><a href="/trending">Trending</a><a href="/activity">Activity</a></nav>
        <nav aria-label="Company navigation"><strong>Company</strong><a href="/faq">FAQ</a><a href="/contact">Support</a><a href="/shipping">Delivery</a></nav>
        <nav aria-label="Legal navigation"><strong>Legal</strong><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/refunds">Refunds</a></nav>
      </div>
      <div className="future-footer-bottom">
        <p>© {new Date().getUTCFullYear()} MYDAY. Every date means something.</p>
        <div><a href="https://x.com/anewbhev" target="_blank" rel="noreferrer" aria-label="MYDAY creator on X">𝕏</a><a href="mailto:anubhavpandey269@gmail.com" aria-label="Email MYDAY">@</a></div>
      </div>
    </footer>
  );
}
