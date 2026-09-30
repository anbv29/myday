'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { AuctionCountdown } from '@/components/auctions/countdown';
import { PublicAttribution } from '@/components/public/attribution';
import type { PublicClaim } from '@/lib/public/types';

export function FeaturedAuction({ claim }: { claim: PublicClaim }) {
  const reducedMotion = useReducedMotion();
  const date = new Date(`${claim.isoDate}T12:00:00Z`);
  const month = date.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  return (
    <motion.article
      className="date-folio"
      initial={reducedMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="folio-topline">
        <span>From the public calendar</span><span>No. {String(claim.rank || 1).padStart(2, '0')}</span>
      </div>
      <a className="folio-date" href={`/day/${claim.isoDate}`} aria-label={`Discover ${claim.fullDate}`}>
        <span>{month}<small>{date.getUTCFullYear()}</small></span>
        <strong>{date.getUTCDate()}</strong><i aria-hidden="true">↗</i>
      </a>
      <div className="folio-story">
        <span className="future-kicker">A day with a story</span>
        <h2>{claim.title}</h2><p>“{claim.story}”</p>
      </div>
      <div className="folio-owner">
        <div><small>Claimed by</small><strong>{claim.attribution ? <PublicAttribution value={claim.attribution} /> : claim.username ?? 'Private'}</strong></div>
        <div><small>Current claim</small><strong>{claim.amount}</strong></div>
      </div>
      <div className="folio-bottom">
        <span><small>Date countdown</small><AuctionCountdown target={claim.isoDate} /></span>
        <a href={`/claim?date=${claim.isoDate}`}>Make a claim ↗</a>
      </div>
    </motion.article>
  );
}
