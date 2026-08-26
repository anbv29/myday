'use client';

import { motion } from 'framer-motion';
import { AuctionVisual } from '@/components/auctions/auction-card';
import { AuctionCountdown } from '@/components/auctions/countdown';
import { PublicAttribution } from '@/components/public/attribution';
import type { PublicClaim } from '@/lib/public/types';

export function FeaturedAuction({ claim }: { claim: PublicClaim }) {
  return (
    <motion.article
      className="featured-auction"
      initial={{ opacity: 0, y: 24, rotate: 0.4 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="featured-auction-media">
        <AuctionVisual claim={claim} index={0} featured />
        <span className="live-badge"><i /> Live now</span>
        <span className="featured-rank">#{claim.rank || 1}</span>
      </div>
      <div className="featured-auction-content">
        <div className="featured-auction-title">
          <div><span>Featured date</span><h2>{claim.fullDate}</h2></div>
          <a href={`/day/${claim.isoDate}`} aria-label={`View ${claim.fullDate}`}>↗</a>
        </div>
        <p>“{claim.story}”</p>
        <div className="featured-owner">Claimed by {claim.attribution ? <PublicAttribution value={claim.attribution} /> : claim.username ?? 'Private'}</div>
        <div className="featured-bid-line">
          <span><small>Current claim</small><strong>{claim.amount}</strong></span>
          <span><small>Interest</small><strong>{Math.max(1, Math.round(claim.trendScore / 100))} bidders</strong></span>
        </div>
        <div className="featured-timer"><small>Date begins in</small><AuctionCountdown target={claim.isoDate} /></div>
        <a className="future-button future-button-primary" href={`/claim?date=${claim.isoDate}`}>Place a claim <span>↗</span></a>
      </div>
    </motion.article>
  );
}
