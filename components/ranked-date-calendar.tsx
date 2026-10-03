import { PublicAttribution } from '@/components/public/attribution';
import { formatPublicDate } from '@/lib/public/format';
import { getTopFeaturedDates } from '@/lib/public/ranked-dates';
import type { PublicClaim } from '@/lib/public/types';

export function RankedDateCalendar({ claims, error }: { claims: PublicClaim[]; error?: string }) {
  const dates = getTopFeaturedDates(claims);

  return (
    <section className="ranked-calendar" id="matrix-view" aria-labelledby="ranked-calendar-title">
      <div className="ranked-calendar-heading">
        <div>
          <h2 id="ranked-calendar-title">Top 30 featured dates</h2>
          <p>Highest paid first. Every tile is a claimed date, not a day of the month.</p>
        </div>
        <span className="ranked-calendar-count">{dates.length} / 30 dates</span>
      </div>
      {error ? <p className="collection-notice" role="status">{error}</p> : null}
      {dates.length ? (
        <ol className="ranked-calendar-grid" aria-label="Featured dates, highest paid first">
          {dates.map((claim) => {
            const date = formatPublicDate(claim.isoDate);
            return (
              <li className="ranked-calendar-cell" key={claim.claimId}>
                <a className="ranked-calendar-link" href={`/day/${claim.isoDate}`} aria-label={`Rank ${claim.rank}: ${date.fullDate}, ${claim.amount}. ${claim.title}`}>
                  <div className="ranked-calendar-value"><span>#{claim.rank}</span><strong>{claim.amount}</strong></div>
                  <time dateTime={claim.isoDate}><span>{date.month} {date.year}</span><b>{date.day}</b></time>
                  <h3>{claim.title}</h3>
                </a>
                <div className="ranked-calendar-holder"><PublicAttribution value={claim.attribution ?? (claim.username ? `@${claim.username}` : null)} />{!claim.attribution && !claim.username ? <span>Anonymous claim</span> : null}</div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="ranked-calendar-empty" role="status">
          <h3>{error ? 'Featured dates are unavailable.' : 'The first featured date could be yours.'}</h3>
          <p>{error ? 'Please try again later.' : 'Confirmed paid claims appear here, ranked by value. No empty calendar days, no invented records.'}</p>
          <a className="future-button future-button-primary" href="/claim">Feature a date</a>
        </div>
      )}
    </section>
  );
}
