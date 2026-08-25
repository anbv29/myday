import Link from 'next/link';
import { Leaderboard } from '@/components/leaderboard';
import { SiteHeader } from '@/components/site-header';
import { claims } from '@/lib/preview-data';

export default function Home() {
  const topClaim = claims[0];

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="preview-ribbon">
        <span>Section 01</span>
        <span>Visual direction · sample data</span>
      </div>
      <SiteHeader />

      <main id="main-content">
        <section className="hero shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">A public record of days that matter</p>
            <h1 id="hero-title">
              EVERY DATE<br />HAS A STORY.<br /><em>SOME HAVE A PRICE.</em>
            </h1>
            <div className="hero-actions">
              <a className="button button-primary" href="#leaderboard">
                See the leaderboard <span aria-hidden="true">↘</span>
              </a>
              <a className="text-link" href="#how-it-works">How it works</a>
            </div>
          </div>

          <Link
            className="top-claim"
            href={`/day/${topClaim.isoDate}`}
            aria-label={`View ${topClaim.fullDate}, claimed for ${topClaim.amount}`}
          >
            <div className="top-claim-heading">
              <span>Currently #1</span>
              <span aria-hidden="true">↗</span>
            </div>
            <div className="monument-date" aria-hidden="true">
              <span>{topClaim.month}</span>
              <strong>{topClaim.day}</strong>
              <span>{topClaim.year}</span>
            </div>
            <div className="top-claim-story">
              <strong>{topClaim.amount}</strong>
              <p>“{topClaim.story}”</p>
              <span>by {topClaim.username}</span>
            </div>
          </Link>
        </section>

        <section className="principles-strip" aria-label="Platform principles">
          <div className="shell principles-grid">
            <p><span>01</span>One current claim per calendar day.</p>
            <p><span>02</span>Higher valid claims replace the current one.</p>
            <p><span>03</span>No resale. No returns. Just a date made public.</p>
          </div>
        </section>

        <section className="leaderboard-section shell" id="leaderboard">
          <div className="section-intro">
            <div>
              <p className="eyebrow">The board</p>
              <h2>THE DAYS PEOPLE<br />PUT A NUMBER ON.</h2>
            </div>
            <p className="section-note">
              Ranked by current claim value. Stories stay in history even after
              a date changes hands.
            </p>
          </div>
          <Leaderboard claims={claims} />
        </section>

        <section className="how-it-works" id="how-it-works">
          <div className="shell how-grid">
            <div>
              <p className="eyebrow">How it works</p>
              <h2>PICK A DAY.<br />SAY WHY.<br />MAKE IT PUBLIC.</h2>
            </div>
            <ol>
              <li><span>01</span><div><strong>Choose any date</strong><p>Past, present, or future. If it matters, it belongs here.</p></div></li>
              <li><span>02</span><div><strong>Give it meaning</strong><p>Write the reason this day deserves a place on the internet.</p></div></li>
              <li><span>03</span><div><strong>Hold the current claim</strong><p>A higher valid claim can take the spotlight. The history remains.</p></div></li>
            </ol>
          </div>
        </section>
      </main>

      <footer className="site-footer shell">
        <Link href="/" className="wordmark">MYDAY.LOL</Link>
        <p>Every date means something to someone.</p>
        <p>© 2026 MYDAY.LOL</p>
      </footer>
    </>
  );
}
