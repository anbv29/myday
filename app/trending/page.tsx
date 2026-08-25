import type { Metadata } from 'next';
import { ClaimGrid } from '@/components/public/claim-grid';
import { DataEmptyState } from '@/components/public/data-state';
import { PublicPage } from '@/components/public/public-page';
import { getTrending } from '@/server/public-data';

export const metadata: Metadata = { title: 'Trending dates', description: 'Public dates attracting the strongest current momentum.' };

export default async function TrendingPage() {
  const result = await getTrending(36);
  return (
    <PublicPage source={result.source}>
      <header className="discovery-hero split">
        <div><p className="eyebrow">Momentum now</p><h1>TRENDING<br />DAYS.</h1></div>
        <p>Calculated from current claim value and recency. No paid placement.</p>
      </header>
      {result.data.length ? <ClaimGrid claims={result.data} /> : <DataEmptyState unavailable={result.source === 'unavailable'} title="Nothing is moving yet." message={result.error ?? 'Trending dates will appear once public claims are confirmed.'} />}
    </PublicPage>
  );
}
