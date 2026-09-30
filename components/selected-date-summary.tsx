import { PublicAttribution } from '@/components/public/attribution';
import type { PublicClaim } from '@/lib/public/types';

export function SelectedDateSummary({ isoDate, claim }: { isoDate: string; claim?: PublicClaim }) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  const month = date.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  return <aside className="selected-date-summary" aria-label="Selected date details">
    <div className="selected-date-stamp">
      <span>{month}<small>{date.getUTCFullYear()}</small></span>
      <strong>{date.getUTCDate()}</strong>
      <p>{date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })}</p>
    </div>
    <div className="selected-date-content" aria-live="polite" aria-atomic="true">
      {claim ? <>
        <h2>{claim.title}</h2>
        <p className="selected-date-story">{claim.story}</p>
        <dl>
          <div><dt>Claimed by</dt><dd><PublicAttribution value={claim.attribution} /></dd></div>
          <div><dt>Current claim</dt><dd>{claim.amount}</dd></div>
        </dl>
        <a className="selected-record-link" href={`/day/${isoDate}`}>View story & claim history</a>
      </> : <>
        <h2>What happened on this day?</h2>
        <p className="selected-date-story">A birthday, a first hello, a fresh start. Choose a date with a story worth sharing.</p>
        <p className="selected-date-availability">This date isn’t in the featured records. Check its latest claim before continuing.</p>
      </>}
    </div>
    <div className="selected-date-action">
      <a className="future-button future-button-primary" href={`/claim?date=${isoDate}`}>
        {claim ? 'Make a higher claim' : 'Check this date'}
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </a>
      <p>Your public claim stays until someone makes a higher valid claim. The latest price is checked before payment.</p>
    </div>
  </aside>;
}
