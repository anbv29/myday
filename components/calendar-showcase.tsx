'use client';

import { useState } from 'react';
import { DateNavigator } from '@/components/date-navigator';
import { PublicAttribution } from '@/components/public/attribution';
import type { PublicClaim } from '@/lib/public/types';

export function CalendarShowcase({ claims }: { claims: PublicClaim[] }) {
  const [filter, setFilter] = useState('all');
  const [angle, setAngle] = useState('front');
  const [month, setMonth] = useState('all');
  const months = Array.from(new Set(claims.map((claim) => claim.month)));
  const visible = claims.filter((claim, index) =>
    (filter !== 'apex' || index < 10) &&
    (filter !== 'future' || claim.period === 'future') &&
    (month === 'all' || claim.month === month));

  return <section className="calendar-showcase shell" id="matrix-view" aria-labelledby="calendar-title">
    <div className="showcase-heading">
      <span className="stitch-badge">The public calendar</span>
      <h2 id="calendar-title">The dates people made matter.</h2>
      <p>Explore current claims and the people behind them. Every date has a story.</p>
    </div>
    <div className="showcase-toolbar">
      <div className="stitch-tabs" aria-label="Filter calendar">
        {[['all', 'All claims'], ['apex', 'Top 10'], ['future', 'Future dates']].map(([value, label]) =>
          <button type="button" aria-pressed={filter === value} key={value} onClick={() => setFilter(value)}>{label}</button>)}
      </div>
      <label className="showcase-month">Month <select value={month} onChange={(event) => setMonth(event.target.value)}>
        <option value="all">All months</option>{months.map((item) => <option key={item}>{item}</option>)}
      </select></label>
    </div>
    <div className="showcase-angle stitch-tabs" aria-label="Calendar perspective">
      {[['iso', 'Isometric'], ['front', 'Front tilt'], ['flat', 'Flat board']].map(([value, label]) =>
        <button type="button" key={value} aria-pressed={angle === value} onClick={() => setAngle(value)}>{label}</button>)}
    </div>
    <div className={`calendar-board angle-${angle}`}>
      {visible.map((claim) => <article className={`calendar-tile${claim.rank === 1 ? ' apex-tile' : ''}`} key={claim.claimId}>
        <div className="calendar-tile-meta"><span>Rank #{String(claim.rank).padStart(2, '0')}</span><strong>{claim.amount}</strong></div>
        <a className="calendar-tile-date" href={`/day/${claim.isoDate}`}><small>{claim.month} {claim.year}</small><strong>{claim.day}</strong><h3>{claim.title}</h3></a>
        <p>{claim.story}</p>
        <div className="calendar-tile-footer"><PublicAttribution value={claim.attribution} /><a href={`/claim?date=${claim.isoDate}`}>Make a claim ↗</a></div>
      </article>)}
      {!visible.length ? <div className="showcase-empty"><h3>No claims in this view yet.</h3><p>Choose a meaningful date and start its story.</p><a className="button button-primary" href="/claim">Claim a date ↗</a></div> : null}
    </div>
    <DateNavigator claims={claims} />
  </section>;
}
