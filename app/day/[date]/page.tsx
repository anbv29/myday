import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { findClaim } from '@/lib/preview-data';

type DatePageProps = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: DatePageProps): Promise<Metadata> {
  const { date } = await params;
  const claim = findClaim(date);
  if (!claim) return { title: 'Date not found' };
  return {
    title: claim.fullDate,
    description: `${claim.story} — currently claimed for ${claim.amount} by ${claim.username}.`,
  };
}

export default async function DatePage({ params }: DatePageProps) {
  const { date } = await params;
  const claim = findClaim(date);
  if (!claim) notFound();

  return (
    <>
      <a className="skip-link" href="#date-content">Skip to content</a>
      <div className="preview-ribbon">
        <span>Section 01</span>
        <span>Visual direction · sample data</span>
      </div>
      <SiteHeader />
      <main id="date-content" className="date-page shell">
        <div className="date-topline">
          <Link href="/#leaderboard">← Back to the board</Link>
          <span>Current rank #{claim.rank}</span>
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
              <span>by {claim.username}</span>
            </div>
          </div>
        </section>

        <div className="date-facts">
          <p><span>From today</span><strong>{claim.distance}</strong></p>
          <p><span>Minimum next claim</span><strong>Calculated at checkout</strong></p>
          <p><span>Visibility</span><strong>Public</strong></p>
        </div>

        <section className="claim-history">
          <div>
            <p className="eyebrow">The record</p>
            <h2>CLAIM HISTORY</h2>
          </div>
          <ol>
            <li className="current-history">
              <span>Current</span><strong>{claim.amount}</strong><span>{claim.username}</span>
            </li>
            {claim.previousClaims.map((previous) => (
              <li key={`${previous.username}-${previous.amount}`}>
                <span>{previous.date}</span><strong>{previous.amount}</strong><span>{previous.username}</span>
              </li>
            ))}
            {claim.previousClaims.length === 0 ? (
              <li className="empty-history">This is the first recorded claim for this date.</li>
            ) : null}
          </ol>
        </section>
      </main>
      <footer className="site-footer shell">
        <Link href="/" className="wordmark">MYDAY.LOL</Link>
        <p>Every date means something to someone.</p>
        <p>© 2026 MYDAY.LOL</p>
      </footer>
    </>
  );
}
