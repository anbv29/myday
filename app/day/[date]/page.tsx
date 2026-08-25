import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CopyLinkButton } from '@/components/copy-link-button';
import { PublicAttribution } from '@/components/public/attribution';
import { DataSourceRibbon } from '@/components/public/data-state';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { isIsoCalendarDate } from '@/lib/public/format';
import { getPublicDate } from '@/server/public-data';

type DatePageProps = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: DatePageProps): Promise<Metadata> {
  const { date } = await params;
  if (!isIsoCalendarDate(date)) return { title: 'Date not found' };
  const result = await getPublicDate(date);
  const claim = result.data?.claim;
  if (!claim) return { title: 'Date not found' };
  return {
    title: claim.fullDate,
    description: claim.isPrivate
      ? `${claim.fullDate} is privately claimed on MYDAY.LOL.`
      : `${claim.story} — currently claimed for ${claim.amount} by ${claim.username}.`,
    openGraph: { title: `${claim.fullDate} — MYDAY.LOL`, description: claim.story, type: 'article' },
  };
}

export default async function DatePage({ params }: DatePageProps) {
  const { date } = await params;
  if (!isIsoCalendarDate(date)) notFound();
  const result = await getPublicDate(date);
  if (!result.data) notFound();
  const { claim, history } = result.data;

  return (
    <>
      <a className="skip-link" href="#date-content">Skip to content</a>
      <DataSourceRibbon source={result.source} />
      <SiteHeader />
      <main id="date-content" className="date-page shell">
        <div className="date-topline">
          <Link href="/#leaderboard">← Back to the board</Link>
          <span>{claim.rank ? `Current rank #${claim.rank}` : 'Current claim'}</span>
        </div>

        <section className="date-monument" aria-labelledby="claim-story">
          <div className="date-monument-calendar">
            <span>{claim.month}</span>
            <strong>{claim.day}</strong>
            <span>{claim.year}</span>
          </div>
          <div className="date-monument-copy">
            <p className="eyebrow">Why this day matters</p>
            <h1 id="claim-story">“{claim.story}”</h1>
            <div className="claim-owner-line">
              <span>Current claim</span>
              <strong>{claim.amount}</strong>
              <span className="date-attribution">{claim.username ? `by ${claim.username}` : 'Claimant private'}<PublicAttribution className="public-attribution" value={claim.attribution} /></span>
            </div>
          </div>
        </section>

        <div className="date-facts">
          <p><span>From today</span><strong>{claim.distance}</strong></p>
          <p><span>Minimum next claim</span><strong>Calculated at checkout</strong></p>
          <p><span>Visibility</span><strong>{claim.visibility}</strong></p>
        </div>

        <div className="date-claim-action">
          <div><p className="eyebrow">Think this date means more to you?</p><strong>The latest valid price is always calculated by the server.</strong></div>
          <div className="date-action-buttons">
            <CopyLinkButton />
            <Link className="button button-primary" href={`/claim?date=${claim.isoDate}`}>{claim.isPrivate ? 'Claim this date' : 'Outbid this date'} <span aria-hidden="true">↗</span></Link>
          </div>
        </div>

        <section className="claim-history">
          <div>
            <p className="eyebrow">The record</p>
            <h2>CLAIM HISTORY</h2>
          </div>
          <ol>
            <li className="current-history">
              <span>Current</span><strong>{claim.amount}</strong><span>{claim.username ?? 'Private'}</span>
            </li>
            {history.filter((item) => item.status === 'superseded').map((previous) => (
              <li key={previous.claimId}>
                <span>{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(previous.claimedAt)).toUpperCase()}</span>
                <strong>{previous.amount}</strong><span>{previous.username ?? 'Private'}</span>
              </li>
            ))}
            {history.filter((item) => item.status === 'superseded').length === 0 ? (
              <li className="empty-history">This is the first recorded claim for this date.</li>
            ) : null}
          </ol>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
