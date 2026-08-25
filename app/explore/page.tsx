import type { Metadata } from 'next';
import { ClaimGrid } from '@/components/public/claim-grid';
import { DataEmptyState } from '@/components/public/data-state';
import { PublicPage } from '@/components/public/public-page';
import { getLeaderboard } from '@/server/public-data';

export const metadata: Metadata = { title: 'Explore dates', description: 'Explore public dates and the stories behind them.' };

export default async function ExplorePage() {
  const result = await getLeaderboard({ range: 'recent', limit: 36 });
  return (
    <PublicPage source={result.source}>
      <header className="discovery-hero split">
        <div><p className="eyebrow">Explore the calendar</p><h1>DAYS WITH<br />A STORY.</h1></div>
        <p>Browse the newest public claims across past milestones and future promises.</p>
      </header>
      {result.data.length ? <ClaimGrid claims={result.data} /> : <DataEmptyState unavailable={result.source === 'unavailable'} title="The calendar is quiet." message={result.error ?? 'The first public stories will appear here.'} />}
    </PublicPage>
  );
}
