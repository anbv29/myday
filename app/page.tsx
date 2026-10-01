import { CalendarShowcase } from '@/components/calendar-showcase';
import { DateCollection } from '@/components/date-collection';
import { LiveAuctions, TrendingRail } from '@/components/auctions/auction-collections';
import { Leaderboard } from '@/components/leaderboard';
import { DataEmptyState, DataSourceRibbon } from '@/components/public/data-state';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { getLeaderboard, getTrending } from '@/server/public-data';
import { getDateCollection } from '@/server/public-data/date-collection';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [leaderboard, trending, collection] = await Promise.all([
    getLeaderboard({ limit: 30 }),
    getTrending(8),
    getDateCollection(),
  ]);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <DataSourceRibbon source={leaderboard.source} />
      <SiteHeader />

      <main id="main-content" className="future-home calendar-first-page">
        <section className="calendar-intro shell" aria-labelledby="calendar-home-title">
          <div><h1 id="calendar-home-title">Every day has a story. <span>Find yours.</span></h1>
          <p>A collection of meaningful dates, ordered through time. Add yours for free, or make it a paid featured date.</p></div>
          <div className="collection-intro-actions"><a className="future-button future-button-primary" href="/claim">Feature a date</a><a className="future-button" href="/register">Register for free</a></div>
        </section>
        <div className="shell calendar-primary">
          <DateCollection entries={collection.data} error={collection.error} />
          <div className="calendar-assurance"><span>No account required</span><span>Verified payments via Dodo Payments</span><a href="/activity">Public claim history</a></div>
        </div>
        <div className="shell future-home-sections">
          <details className="calendar-records">
            <summary>Explore featured stories <span>{leaderboard.data.length} {leaderboard.data.length === 1 ? 'record' : 'records'}</span></summary>
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
            <div className="future-how-intro"><h2 id="future-how-title">Your date. Your story.</h2><p>Register a date for free or make a paid featured claim. Paid claims take priority over free registrations; a higher valid payment can replace the paid holder.</p></div>
            <ol>
              <li><span>01</span><div><h3>Choose your date.</h3><p>A birthday, a milestone, a moment worth remembering. Every date includes its year.</p></div></li>
              <li><span>02</span><div><h3>Register or feature it.</h3><p>Add your story and public handle. Register for free if unclaimed, or pay the latest valid price to feature it.</p></div></li>
              <li><span>03</span><div><h3>See it in the collection.</h3><p>Dates appear chronologically. Paid claims replace free entries and join the payment-ranked leaderboard.</p></div></li>
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
