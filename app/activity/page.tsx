import type { Metadata } from 'next';
import { DataEmptyState } from '@/components/public/data-state';
import { PublicPage } from '@/components/public/public-page';
import { getRecentActivity } from '@/server/public-data';

export const metadata: Metadata = { title: 'Activity', description: 'Recent public claim activity on MYDAY.' };

export default async function ActivityPage() {
  const result = await getRecentActivity();
  return (
    <PublicPage source={result.source}>
      <header className="discovery-hero split">
        <div><p className="eyebrow">The live record</p><h1>RECENT<br />ACTIVITY.</h1></div>
        <p>Only public, confirmed claim events appear in this feed.</p>
      </header>
      {result.data.length ? (
        <ol className="activity-list">
          {result.data.map((event) => (
            <li key={event.eventId}>
              <time dateTime={event.createdAt}>{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(event.createdAt))} UTC</time>
              <p><a href={`/${event.username}`}>{event.username}</a> {event.eventType === 'outbid' ? 'was recorded in the history of' : 'claimed'} <a href={`/day/${event.isoDate}`}>{event.fullDate}</a>.</p>
              <strong>{event.amount}</strong>
            </li>
          ))}
        </ol>
      ) : <DataEmptyState unavailable={result.source === 'unavailable'} title="No public activity yet." message={result.error ?? 'Confirmed claim events will appear here.'} />}
    </PublicPage>
  );
}
