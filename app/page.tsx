import Link from 'next/link';
import { Leaderboard } from '@/components/leaderboard';
import { PublicAttribution } from '@/components/public/attribution';
import { DataEmptyState, DataSourceRibbon } from '@/components/public/data-state';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { getLeaderboard } from '@/server/public-data';

export default async function Home() {
  const result = await getLeaderboard({ limit: 8 });
  const topClaim = result.data[0];

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <DataSourceRibbon source={result.source} />
      <SiteHeader />

      <main id="main-content">
        <section className="hero shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">A public record of days that matter</p>
            <h1 id="hero-title">
              EVERY DATE<br />HAS A STORY.<br /><em>SOME HAVE A PRICE.</em>
            </h1>
            <div className="hero-actions">
              <Link className="button button-primary" href="/claim">
                Claim a date <span aria-hidden="true">↗</span>
              </Link>
              <a className="button button-primary" href="#leaderboard">
                See the leaderboard <span aria-hidden="true">↘</span>
              </a>
              <a className="text-link" href="#how-it-works">How it works</a>
            </div>
          </div>

          {topClaim ? <article
            className="top-claim"
          >
            <div className="top-claim-heading">
              <span>Currently #1</span>
              <Link href={`/day/${topClaim.isoDate}`} aria-label={`View ${topClaim.fullDate}, claimed for ${topClaim.amount}`}>↗</Link>
            </div>
            <Link className="monument-date" href={`/day/${topClaim.isoDate}`} aria-label={`View ${topClaim.fullDate}`}>
              <span>{topClaim.month}</span>
              <strong>{topClaim.day}</strong>
              <span>{topClaim.year}</span>
            </Link>
            <div className="top-claim-story">
              <strong>{topClaim.amount}</strong>
              <p>“{topClaim.story}”</p>
              <span className="top-claim-owner">by {topClaim.attribution ? <PublicAttribution className="public-attribution" value={topClaim.attribution} /> : topClaim.username}</span>
            </div>
          </article> : (
            <DataEmptyState
              unavailable={result.source === 'unavailable'}
              title={result.source === 'unavailable' ? 'The board is offline.' : 'The first day is waiting.'}
              message={result.error ?? 'No public date has been claimed yet.'}
            />
          )}
        </section>

        <section className="principles-strip" aria-label="Platform principles">
          <div className="shell principles-grid">
            <p><span>01</span><strong>One current claim per calendar day.</strong></p>
            <p><span>02</span><strong>Higher valid claims replace the current one.</strong></p>
            <p><span>03</span><strong>No resale. No returns. Just a date made public.</strong></p>
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
          {result.data.length ? <Leaderboard claims={result.data} /> : (
            <DataEmptyState
              unavailable={result.source === 'unavailable'}
              title="No claims to rank."
              message={result.error ?? 'Public claims will appear here as soon as they are confirmed.'}
            />
          )}
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

      <SiteFooter />
    </>
  );
}
