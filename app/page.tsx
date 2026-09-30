import { CalendarShowcase } from '@/components/calendar-showcase';
import { DateNavigator } from '@/components/date-navigator';
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

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <DataSourceRibbon source={leaderboard.source} />
      <SiteHeader />

      <main id="main-content" className="future-home calendar-first-page">
        <section className="calendar-intro shell" aria-labelledby="calendar-home-title">
          <div><h1 id="calendar-home-title">Every day has a story.<br /><span>Find yours.</span></h1>
          <p>Pick a date. Discover who claimed it, or give it a story of your own.</p></div>
          <a href="#how-it-works">How claiming works</a>
        </section>
        <div className="shell calendar-primary">
          <DateNavigator claims={leaderboard.data} />
          <div className="calendar-assurance"><span>No account required</span><span>Verified payments via Razorpay</span><a href="/activity">Public claim history</a></div>
        </div>
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
