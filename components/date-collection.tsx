'use client';

import { useState } from 'react';
import { PublicAttribution } from '@/components/public/attribution';
import { formatPublicDate } from '@/lib/public/format';
import type { DateCollectionEntry } from '@/lib/public/date-collection';

export function DateCollection({ entries, error, id = 'matrix-view' }: { entries: DateCollectionEntry[]; error?: string; id?: string }) {
  const [filter, setFilter] = useState('all');
  const [order, setOrder] = useState('date');
  const [year, setYear] = useState('all');
  const years = [...new Set(entries.map((entry) => entry.isoDate.slice(0, 4)))].sort();
  const visible = entries.filter((entry) => (filter === 'all' || entry.kind === filter) && (year === 'all' || entry.isoDate.startsWith(year)))
    .sort((a, b) => order === 'date' ? a.isoDate.localeCompare(b.isoDate) : (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.isoDate.localeCompare(b.isoDate));
  return <section className="date-collection" id={id} aria-label="Registered dates collection">
    <div className="collection-toolbar">
      <div className="stitch-tabs" aria-label="Filter registered dates">{[['all', 'All dates'], ['featured', 'Paid featured'], ['free', 'Free registrations']].map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
      <div className="collection-selects">
        <label>Year<select value={year} onChange={(event) => setYear(event.target.value)}><option value="all">All years</option>{years.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Sort by<select value={order} onChange={(event) => setOrder(event.target.value)}><option value="date">Date · earliest first</option><option value="value">Highest paid first</option></select></label>
      </div>
    </div>
    <p className="collection-caption" aria-live="polite">{visible.length} {visible.length === 1 ? 'date' : 'dates'} shown. Only submitted dates appear here; paid claims take priority.</p>
    {error ? <p className="collection-notice" role="status">{error}</p> : null}
    <div className="collection-grid">
      {visible.map((entry) => {
        const date = formatPublicDate(entry.isoDate);
        return <article className={`collection-date is-${entry.kind}`} key={entry.id}>
          <div className="collection-date-top"><span className="collection-kind">{entry.kind === 'featured' ? 'Paid featured' : 'Free registration'}</span><strong>{entry.amount}</strong></div>
          <time dateTime={entry.isoDate}><span>{date.month} {date.year}</span><strong>{date.day}</strong></time>
          <div className="collection-story"><h2>{entry.title}</h2><p>{entry.story}</p></div>
          <div className="collection-claimant"><span>{entry.kind === 'featured' ? 'Claimed by' : 'Registered by'}</span><PublicAttribution value={entry.attribution} /></div>
          {entry.kind === 'free' && entry.registeredAt ? <p className="collection-caption">Registered <time dateTime={entry.registeredAt} className="collection-registration-time">{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(entry.registeredAt))}</time></p> : null}
          <a className="collection-date-link" href={entry.kind === 'featured' ? `/day/${entry.isoDate}` : `/claim?date=${entry.isoDate}`}>{entry.kind === 'featured' ? 'View story & claim history' : 'Feature this date with a paid claim'}<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></a>
        </article>;
      })}
    </div>
    {!visible.length ? <div className="collection-empty"><h2>No dates in this view yet.</h2><p>Register a meaningful date for free, or make a paid featured claim.</p><a className="future-button future-button-primary" href="/register">Register a date for free</a></div> : null}
    <p className="collection-footnote">Showing up to 300 paid and 300 eligible free records. A free registration is not exclusive ownership; a paid claim takes its place. Higher valid payments replace the current paid holder.</p>
  </section>;
}
