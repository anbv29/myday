'use client';

import { useMemo, useState } from 'react';
import { PublicAttribution } from '@/components/public/attribution';
import { excerptWords } from '@/lib/public/format';
import type { PublicClaim } from '@/lib/public/types';

type Filter = 'all' | 'future' | 'past';
const collectorBioWordLimit = 14;

export function Leaderboard({ claims }: { claims: PublicClaim[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const visibleClaims = useMemo(
    () => claims.filter((claim) => filter === 'all' || claim.period === filter),
    [claims, filter],
  );

  return (
    <div className="leaderboard-wrap">
      <div className="board-controls">
        <div className="filter-group" aria-label="Filter dates">
          {(['all', 'future', 'past'] as Filter[]).map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? 'active' : undefined}
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {item === 'all' ? 'All dates' : item}
            </button>
          ))}
        </div>
        <span>{visibleClaims.length} claims</span>
      </div>

      <div className="leaderboard-head" aria-hidden="true">
        <span>Rank</span><span>Date</span><span>Current claim</span>
        <span>Why it matters</span><span>Claimed by / link</span><span />
      </div>

      <ol className="leaderboard-list">
        {visibleClaims.map((claim) => (
          <li key={claim.isoDate}>
            <div className="leaderboard-row">
              <span className="rank">{String(claim.rank).padStart(2, '0')}</span>
              <a className="row-date" href={`/day/${claim.isoDate}`}><strong>{claim.shortDate}</strong><small>{claim.period}</small></a>
              <strong className="row-amount">{claim.amount}</strong>
              <span className="row-story">{claim.story}</span>
              <span className="row-user">{claim.attribution ? <PublicAttribution className="public-attribution" value={claim.attribution} /> : <small>{claim.displayName ?? claim.username ?? 'Private claim'}</small>}{claim.collectorBio ? <span className="row-user-bio">{excerptWords(claim.collectorBio, collectorBioWordLimit)}</span> : null}</span>
              <a className="row-arrow" href={`/day/${claim.isoDate}`} aria-label={`View ${claim.fullDate}`}>↗</a>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
