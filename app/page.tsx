import { CalendarShowcase } from '@/components/calendar-showcase';
import { FeaturedAuction } from '@/components/auctions/featured-auction';
import { LiveAuctions, TrendingRail } from '@/components/auctions/auction-collections';
import { Leaderboard } from '@/components/leaderboard';
import { DataEmptyState, DataSourceRibbon } from '@/components/public/data-state';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { getLeaderboard, getTrending } from '@/server/public-data';

export default async function Home() {
  const [leaderboard, trending] = await Promise.all([
    getLeaderboard({ limit: 30 }),
    getTrending(8),
  ]);
  const topClaim = leaderboard.data[0];

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <DataSourceRibbon source={leaderboard.source} />
      <SiteHeader />

      <main id="main-content" className="future-home">
        <section className="future-hero shell" aria-labelledby="future-hero-title">
          <div className="future-hero-glow" aria-hidden="true" />
          <div className="future-hero-copy">
            <span className="stitch-badge">A calendar of meaningful moments</span>
            <h1 id="future-hero-title">Some days<br />deserve to<br /><em>be yours.</em></h1>
            <p>Your anniversary, breakthrough, or unforgettable milestone. Give it a story and a place on the MYDAY calendar.</p>
            <div className="future-hero-actions">
              <a className="future-button future-button-primary" href="#matrix-view">Explore the calendar <span>↗</span></a>
              <a className="future-button future-button-secondary" href="#how-it-works">How it works <span>↓</span></a>
            </div>
            <div className="future-proof">
              <span><b>01</b>No account required</span>
              <span><b>02</b>Verified payments</span>
              <span><b>03</b>Public claim history</span>
            </div>
          </div>
          {topClaim ? <FeaturedAuction claim={topClaim} /> : <div className="hero-empty"><span className="future-kicker">An open calendar</span><p>Your story could start here.</p><a href="/claim">Find your date ↗</a></div>}
          <div className="stitch-stat-ribbon">
            <div><span>Featured public claims</span><strong>{leaderboard.data.length}</strong><small>In this calendar view</small></div>
            <div><span>Highest current claim</span><strong>{topClaim?.amount ?? '—'}</strong><small>{topClaim?.shortDate ?? 'The first date is waiting'}</small></div>
            <div><span>Make your mark</span><strong>Your date. Your story.</strong><small>No account required</small></div>
            <div><span>Secure checkout</span><strong>Razorpay</strong><small>Confirmed payments only</small></div>
          </div>
        </section>

        <div className="future-market-bar" aria-label="MYDAY market principles">
          <div className="shell"><span><i /> Live claims</span><p>One calendar. Infinite stories. One current claim for every day.</p><a href="/activity">View activity ↗</a></div>
        </div>

        <CalendarShowcase claims={leaderboard.data} />
        <div className="shell future-home-sections">
          <LiveAuctions claims={leaderboard.data.slice(0, 12)} />
          <TrendingRail claims={trending.data} />

          <section className="future-section market-board" id="leaderboard" aria-labelledby="market-board-title">
            <div className="future-section-heading">
              <div><span className="future-kicker">Market leaders</span><h2 id="market-board-title">The dates at the top</h2></div>
              <p>Ranked by the value of each current, verified claim.</p>
            </div>
            {leaderboard.data.length ? <Leaderboard claims={leaderboard.data} /> : <DataEmptyState unavailable={leaderboard.source === 'unavailable'} title="No claims to rank." message={leaderboard.error ?? 'Confirmed claims will appear here.'} />}
          </section>
        </div>

        <section className="future-how" id="how-it-works" aria-labelledby="future-how-title">
          <div className="shell">
            <div className="future-how-intro"><span className="future-kicker">Simple by design</span><h2 id="future-how-title">A date becomes yours in three moves.</h2><p>No account. No resale market. Just a verified claim and the story behind it.</p></div>
            <ol>
              <li><span>01</span><div><small>Find</small><h3>Choose your date.</h3><p>Past, present, or future—discover the day that means something to you.</p></div><b aria-hidden="true">⌁</b></li>
              <li><span>02</span><div><small>Claim</small><h3>Put meaning behind it.</h3><p>Set a valid claim, add your story and public handle, then pay securely.</p></div><b aria-hidden="true">↗</b></li>
              <li><span>03</span><div><small>Hold</small><h3>Take your place.</h3><p>Your name becomes part of the record until a higher valid claim arrives.</p></div><b aria-hidden="true">✦</b></li>
            </ol>
          </div>
        </section>

        <section className="future-final-cta shell">
          <div className="final-cta-orbit" aria-hidden="true"><i /><i /><i /></div>
          <span className="future-kicker">Your moment is on the calendar</span>
          <h2>Something worth claiming is waiting.</h2>
          <p>Find the date. Tell its story. Make it yours.</p>
          <a className="future-button future-button-primary" href="/claim">Claim your date <span>↗</span></a>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
