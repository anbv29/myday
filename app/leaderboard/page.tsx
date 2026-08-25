import type { Metadata } from 'next';
import { Leaderboard } from '@/components/leaderboard';
import { DataEmptyState } from '@/components/public/data-state';
import { PublicPage } from '@/components/public/public-page';
import { getLeaderboard, type DateScope, type LeaderboardRange } from '@/server/public-data';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'The highest current public claims across the MYDAY.LOL calendar.',
};

type Props = { searchParams: Promise<{ range?: string; scope?: string }> };
const ranges: LeaderboardRange[] = ['all', 'week', 'month', 'recent'];
const scopes: DateScope[] = ['all', 'future', 'past'];

export default async function LeaderboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const range = ranges.includes(params.range as LeaderboardRange) ? params.range as LeaderboardRange : 'all';
  const scope = scopes.includes(params.scope as DateScope) ? params.scope as DateScope : 'all';
  const result = await getLeaderboard({ range, scope, limit: 100 });

  return (
    <PublicPage source={result.source}>
      <header className="discovery-hero">
        <p className="eyebrow">The public record</p>
        <h1>THE<br />LEADER<wbr />BOARD.</h1>
        <p>Current public claims, ranked by canonical claim value.</p>
      </header>
      <nav className="query-filters" aria-label="Leaderboard filters">
        <div>
          <span>Claimed</span>
          {ranges.map((item) => <a className={item === range ? 'active' : ''} href={`/leaderboard?range=${item}&scope=${scope}`} key={item}>{item}</a>)}
        </div>
        <div>
          <span>Date</span>
          {scopes.map((item) => <a className={item === scope ? 'active' : ''} href={`/leaderboard?range=${range}&scope=${item}`} key={item}>{item}</a>)}
        </div>
      </nav>
      {result.data.length ? <Leaderboard claims={result.data} /> : (
        <DataEmptyState unavailable={result.source === 'unavailable'} title="No claims match this view." message={result.error ?? 'Try another time range or date scope.'} />
      )}
    </PublicPage>
  );
}
