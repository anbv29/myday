'use client';

import { useState } from 'react';
import { SelectedDateSummary } from '@/components/selected-date-summary';
import type { PublicClaim } from '@/lib/public/types';

const monthNames = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, index, 1))));

export function DateNavigator({ claims }: { claims: PublicClaim[] }) {
  const initial = claims[0]?.isoDate ?? '2026-10-01';
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
    setYear(nextYear);
    setMonth(next.getUTCMonth());
  }

  return <section className="date-navigator" aria-label="Browse calendar dates">
    <div className="date-navigator-heading">
      <div><span className="eyebrow">Find your moment</span><h3>{monthNames[month]} {year}</h3></div>
      <div className="date-navigator-controls">
        <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month">←</button>
        <label className="sr-only" htmlFor="calendar-year">Calendar year</label>
        <select id="calendar-year" value={year} onChange={(event) => setYear(Number(event.target.value))}>
          {Array.from({ length: 201 }, (_, index) => 1900 + index).map((value) => <option key={value}>{value}</option>)}
        </select>
        <button type="button" onClick={() => moveMonth(1)} aria-label="Next month">→</button>
      </div>
    </div>
    <div className="month-grid">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span className="weekday" key={day}>{day}</span>)}
      {Array.from({ length: offset }, (_, index) => <span aria-hidden="true" key={`blank-${index}`} />)}
      {Array.from({ length: days }, (_, index) => {
        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`;
        const claim = dates.get(iso);
        return <a className={claim ? 'has-claim' : undefined} href={claim ? `/day/${iso}` : `/claim?date=${iso}`} key={iso} aria-label={`${monthNames[month]} ${index + 1}, ${year}${claim ? `: ${claim.title}` : ': check date'}`}><strong>{index + 1}</strong><small>{claim?.amount ?? 'Check date'}</small></a>;
      })}
    </div>
    <p>Highlighted dates appear in this showcase. Choose any other date to check its current claim.</p>
  </section>;
}
