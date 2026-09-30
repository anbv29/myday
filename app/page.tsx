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
          <details className="calendar-records">
            <summary>Explore featured stories <span>{leaderboard.data.length} records</span></summary>
            <CalendarShowcase claims={leaderboard.data} showNavigator={false} />
            {leaderboard.data.length > 1 ? <LiveAuctions claims={leaderboard.data.slice(0, 12)} /> : null}
          </details>
          {trending.data.length > 1 ? <TrendingRail claims={trending.data} /> : null}
          <section className="future-section market-board" id="leaderboard" aria-labelledby="market-board-title">
            <div className="future-section-heading">
              <div><h2 id="market-board-title">Dates that made their mark.</h2></div>
              <p>Ranked by the value of each current, verified claim.</p>
            </div>
            {leaderboard.data.length ? <Leaderboard claims={leaderboard.data} /> : <DataEmptyState unavailable={leaderboard.source === 'unavailable'} title="No claims to rank." message={leaderboard.error ?? 'Confirmed claims will appear here.'} />}
          </section>
        </div>

        <section className="future-how" id="how-it-works" aria-labelledby="future-how-title">
          <div className="shell">
            <div className="future-how-intro"><h2 id="future-how-title">A little date.<br />A lot of meaning.</h2><p>Make a verified public claim, not a purchase of permanent ownership. A higher valid claim can replace the current holder.</p></div>
            <ol>
              <li><span>01</span><div><h3>Find a meaningful day.</h3><p>Browse the calendar and check the latest claim for your date.</p></div></li>
              <li><span>02</span><div><h3>Give it your story.</h3><p>Add a story and public handle, set a valid amount, and pay securely.</p></div></li>
              <li><span>03</span><div><h3>Become part of the record.</h3><p>Confirmed claims appear publicly. Your claim stays current until a higher valid claim arrives.</p></div></li>
            </ol>
          </div>
        </section>

        <section className="future-final-cta shell">
          <h2>Which day means everything to you?</h2>
          <p>The first hello. The big leap. The day it all began.</p>
          <a className="future-button future-button-primary" href="#matrix-view">Find your date</a>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
