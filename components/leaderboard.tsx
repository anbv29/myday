'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { PreviewClaim } from '@/lib/preview-data';

type Filter = 'all' | 'future' | 'past';

export function Leaderboard({ claims }: { claims: PreviewClaim[] }) {
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
        <span>Why it matters</span><span>Bought by</span><span />
      </div>

      <ol className="leaderboard-list">
        {visibleClaims.map((claim) => (
          <li key={claim.isoDate}>
            <Link className="leaderboard-row" href={`/day/${claim.isoDate}`}>
              <span className="rank">{String(claim.rank).padStart(2, '0')}</span>
              <span className="row-date"><strong>{claim.shortDate}</strong><small>{claim.period}</small></span>
              <strong className="row-amount">{claim.amount}</strong>
              <span className="row-story">{claim.story}</span>
              <span className="row-user">{claim.username}</span>
              <span className="row-arrow" aria-hidden="true">↗</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
