'use client';

import { useState } from 'react';
import { SelectedDateSummary } from '@/components/selected-date-summary';
import type { PublicClaim } from '@/lib/public/types';

const monthNames = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, index, 1))));

export function DateNavigator({ claims }: { claims: PublicClaim[] }) {
  const initial = claims[0]?.isoDate ?? new Date().toISOString().slice(0, 10);
  const [selected, setSelected] = useState(initial);
  const [year, setYear] = useState(Number(initial.slice(0, 4)));
  const [month, setMonth] = useState(Number(initial.slice(5, 7)) - 1);
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const dates = new Map(claims.map((claim) => [claim.isoDate, claim]));
  function selectDate(iso: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || iso < '1900-01-01' || iso > '2100-12-31') return;
    setSelected(iso);
    setYear(Number(iso.slice(0, 4)));
    setMonth(Number(iso.slice(5, 7)) - 1);
  }
  function moveMonth(direction: number) {
    const next = new Date(Date.UTC(year, month + direction, 1));
    const nextYear = next.getUTCFullYear();
    if (nextYear < 1900 || nextYear > 2100) return;
    selectDate(`${nextYear}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`);
  }

  return <section className="calendar-workspace" aria-label="Browse calendar dates" id="matrix-view">
    <div className="date-navigator">
    <div className="date-navigator-heading">
      <h2>{monthNames[month]} <span>{year}</span></h2>
      <div className="date-navigator-controls">
        <button type="button" onClick={() => selectDate(new Date().toISOString().slice(0, 10))}>Today</button>
        <button type="button" onClick={() => moveMonth(-1)} disabled={year === 1900 && month === 0} aria-label="Previous month"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m14 6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        <label className="sr-only" htmlFor="calendar-year">Calendar year</label>
        <select id="calendar-year" value={year} onChange={(event) => selectDate(`${event.target.value}-${String(month + 1).padStart(2, '0')}-01`)}>
          {Array.from({ length: 201 }, (_, index) => 1900 + index).map((value) => <option key={value}>{value}</option>)}
        </select>
        <button type="button" onClick={() => moveMonth(1)} disabled={year === 2100 && month === 11} aria-label="Next month"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m10 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      </div>
    </div>
    <div className="calendar-jump">
      <label htmlFor="calendar-month">Jump to month<select id="calendar-month" value={month} onChange={(event) => selectDate(`${year}-${String(Number(event.target.value) + 1).padStart(2, '0')}-01`)}>{monthNames.map((name, index) => <option value={index} key={name}>{name}</option>)}</select></label>
      <label htmlFor="calendar-date">Find a specific date<input id="calendar-date" type="date" min="1900-01-01" max="2100-12-31" value={selected} onChange={(event) => selectDate(event.target.value)} /></label>
    </div>
    <div className="month-grid">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span className="weekday" key={day}>{day}</span>)}
      {Array.from({ length: offset }, (_, index) => <span aria-hidden="true" key={`blank-${index}`} />)}
      {Array.from({ length: days }, (_, index) => {
        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`;
        const claim = dates.get(iso);
        return <button type="button" className={`calendar-day${claim ? ' has-claim' : ''}${selected === iso ? ' is-selected' : ''}`} onClick={() => selectDate(iso)} aria-pressed={selected === iso} key={iso} aria-label={`${monthNames[month]} ${index + 1}, ${year}${claim ? `: ${claim.title}, ${claim.amount}` : ': check date'}`}><strong>{index + 1}</strong>{claim ? <small>{claim.amount}</small> : <span aria-hidden="true" className="calendar-day-mark" />}</button>;
      })}
    </div>
    <div className="calendar-legend"><span><i /> Featured claim</span><span><i /> Selected date</span></div>
    <p>Featured records are a limited public showcase, not the complete calendar. Check a date for its latest claim.</p>
    </div>
    <SelectedDateSummary isoDate={selected} claim={dates.get(selected)} />
  </section>;
}
