'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { AuctionCard, AuctionVisual } from '@/components/auctions/auction-card';
import { auctionFilters, matchesAuctionFilter, trendIncrease, type AuctionFilter } from '@/lib/auction-display';
import type { PublicClaim } from '@/lib/public/types';

export function LiveAuctions({ claims }: { claims: PublicClaim[] }) {
  const [filter, setFilter] = useState<AuctionFilter>('all');
  const visible = useMemo(() => claims.filter((claim) => matchesAuctionFilter(claim, filter)), [claims, filter]);

  return (
    <section className="future-section live-auctions-section" id="live-auctions" aria-labelledby="live-auctions-title">
      <div className="future-section-heading">
        <div><span className="future-kicker"><i /> Live calendar</span><h2 id="live-auctions-title">Live right now</h2></div>
        <a href="/explore">View every date <span>↗</span></a>
      </div>
      <div className="auction-filter-row" role="group" aria-label="Filter live date auctions">
        {auctionFilters.map((item) => <button type="button" className={filter === item.value ? 'active' : undefined} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)} key={item.value}>{item.label}</button>)}
      </div>
      <motion.div className="auction-grid" layout>
        <AnimatePresence mode="popLayout">
          {visible.map((claim, index) => <AuctionCard claim={claim} index={index} key={claim.claimId} />)}
        </AnimatePresence>
      </motion.div>
      {!visible.length ? <div className="auction-filter-empty"><strong>No dates match this view yet.</strong><button type="button" onClick={() => setFilter('all')}>Show all dates</button></div> : null}
    </section>
  );
}

export function TrendingRail({ claims }: { claims: PublicClaim[] }) {
  if (!claims.length) return null;
  return (
    <section className="future-section trending-section" aria-labelledby="trending-title">
      <div className="future-section-heading">
        <div><span className="future-kicker">The signal</span><h2 id="trending-title">Trending dates</h2></div>
        <a href="/trending">See the momentum <span>↗</span></a>
      </div>
      <div className="trending-rail">
        {claims.slice(0, 8).map((claim, index) => (
          <motion.a className="trend-card" href={`/day/${claim.isoDate}`} whileHover={{ y: -6 }} transition={{ duration: 0.22 }} key={claim.claimId}>
            <div className="trend-card-visual"><AuctionVisual claim={claim} index={index + 1} /><span>{String(index + 1).padStart(2, '0')}</span></div>
            <div className="trend-card-copy"><div><h3>{claim.fullDate}</h3><p>{claim.title}</p></div><strong>{claim.amount}</strong></div>
            <div className="trend-card-meta"><span>Highest claim</span><b>↗ {trendIncrease(claim)}%</b></div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
