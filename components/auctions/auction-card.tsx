'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
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
  const reducedMotion = useReducedMotion();

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
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
      transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="auction-card-link">
        <span className="auction-card-index">{String(index + 1).padStart(2, '0')}</span>
        <div className="auction-card-date">
          <strong>{claim.day}</strong>
          <span>{claim.month.slice(0, 3)} · {claim.year}</span>
        </div>
        <div className="auction-card-body">
          <div>
            <p>{claim.fullDate}</p>
            <h3>{claim.title}</h3>
            <span className="auction-card-story">{claim.story}</span>
          </div>
          <span className="auction-card-owner">Held by {claim.attribution ? <PublicAttribution value={claim.attribution} /> : claim.username ?? 'Private'}</span>
        </div>
        <div className="auction-card-value"><small>Current claim</small><strong>{claim.amount}</strong></div>
        <a className="auction-card-arrow" href={`/day/${claim.isoDate}`} aria-label={`View ${claim.fullDate}`}>View →</a>
      </div>
    </motion.article>
  );
}
