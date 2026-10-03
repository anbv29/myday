import type { Metadata } from 'next';
import { DateCollection } from '@/components/date-collection';
import { PublicPage } from '@/components/public/public-page';
import { getDateCollection } from '@/server/public-data/date-collection';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Explore dates', description: 'Explore public dates and the stories behind them.' };

export default async function ExplorePage() {
  const result = await getDateCollection();
  return (
    <PublicPage source={result.source}>
      <header className="discovery-hero split">
        <div><p className="eyebrow">Explore the calendar</p><h1>Days with a story.</h1></div>
        <p>Browse free registrations and paid featured stories across past milestones and future promises.</p>
      </header>
      <DateCollection entries={result.data} error={result.error} />
    </PublicPage>
  );
}
