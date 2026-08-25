import type { Metadata } from 'next';
import { ClaimGrid } from '@/components/public/claim-grid';
import { DataEmptyState } from '@/components/public/data-state';
import { PublicPage } from '@/components/public/public-page';
import { searchPublicClaims } from '@/server/public-data';

export const metadata: Metadata = { title: 'Search', description: 'Search public dates, stories, and usernames.' };
type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q = '' } = await searchParams;
  const query = q.trim().slice(0, 100);
  const result = await searchPublicClaims(query);
  return (
    <PublicPage source={result.source}>
      <header className="search-hero">
        <p className="eyebrow">Search the record</p>
        <h1>FIND A DAY.</h1>
        <form action="/search" method="get" className="search-form">
          <label htmlFor="public-search">Date, story, title, or username</label>
          <div><input id="public-search" name="q" defaultValue={query} minLength={2} maxLength={100} placeholder="Try 2027-08-18 or @username" /><button type="submit">Search ↗</button></div>
        </form>
      </header>
      {query.length < 2 ? <DataEmptyState title="Start with two characters." message="Search by ISO date, words from a story, or a public username." />
        : result.data.length ? <><p className="result-count">{result.data.length} result{result.data.length === 1 ? '' : 's'} for “{query}”</p><ClaimGrid claims={result.data} /></>
          : <DataEmptyState unavailable={result.source === 'unavailable'} title="No public matches." message={result.error ?? 'Try a different date, story phrase, or username.'} />}
    </PublicPage>
  );
}
