'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AuctionCountdown } from '@/components/auctions/countdown';
import { PublicAttribution } from '@/components/public/attribution';
import { visualForAuction } from '@/lib/auction-display';
import type { PublicClaim } from '@/lib/public/types';

export function AuctionVisual({ claim, index, featured = false }: { claim: PublicClaim; index: number; featured?: boolean }) {
  const visual = visualForAuction(index);
  return (
    <div className={`auction-visual auction-visual-${visual.variant}${featured ? ' is-featured' : ''}`} aria-hidden="true">
      <span className="auction-visual-orbit" />
      <span className="auction-visual-date"><small>{claim.month.slice(0, 3)}</small><strong>{claim.day}</strong><small>{claim.year}</small></span>
      <span className="auction-visual-caption">{visual.kicker}</span>
    </div>
  );
}

export function AuctionCard({ claim, index }: { claim: PublicClaim; index: number }) {
  const router = useRouter();

  return (
    <motion.article
      className="auction-card"
      role="link"
      tabIndex={0}
      aria-label={`View the auction for ${claim.fullDate}`}
      onClick={(event) => {
        if ((event.target as Element).closest('a')) return;
        router.push(`/day/${claim.isoDate}`);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') router.push(`/day/${claim.isoDate}`);
      }}
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.2), ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="auction-card-link">
        <div className="auction-card-media">
          <AuctionVisual claim={claim} index={index} />
          <span className="live-badge"><i /> Live</span>
          <span className="auction-card-time"><AuctionCountdown target={claim.isoDate} compact /></span>
        </div>
        <div className="auction-card-body">
          <div>
            <p>{claim.fullDate}</p>
            <h3>{claim.title}</h3>
          </div>
          <span className="auction-card-owner">Held by {claim.attribution ? <PublicAttribution value={claim.attribution} /> : claim.username ?? 'Private'}</span>
          <div className="auction-card-meta">
            <span><small>Current claim</small><strong>{claim.amount}</strong></span>
            <span><small>Activity</small><strong>{Math.max(1, Math.round(claim.trendScore / 100))} bids</strong></span>
            <a href={`/day/${claim.isoDate}`} aria-label={`View ${claim.fullDate}`}>↗</a>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
