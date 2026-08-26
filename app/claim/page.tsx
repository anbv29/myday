import type { Metadata } from 'next';
import { ClaimForm } from '@/components/claims/claim-form';
import { DataEmptyState } from '@/components/public/data-state';
import { PublicPage } from '@/components/public/public-page';
import { isIsoCalendarDate } from '@/lib/public/format';
import { getClaimQuote } from '@/server/claims/quotes';
import { getPaymentProvider } from '@/server/payments';

export const metadata: Metadata = {
  title: 'Claim a date',
  description: 'Choose a meaningful date, tell its story, and create a verified public claim.',
};

type Props = { searchParams: Promise<{ date?: string; cancelled?: string }> };

export default async function ClaimPage({ searchParams }: Props) {
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const date = params.date && isIsoCalendarDate(params.date) ? params.date : today;
  const result = await getClaimQuote(date);

  return (
    <PublicPage source={result.source} mainClassName="claim-page shell">
      <header className="claim-page-header">
        <div><p className="eyebrow">No account required</p><h1>CLAIM<br />YOUR DAY.</h1></div>
        <div className="date-picker-panel">
          <form action="/claim" method="get">
            <label htmlFor="claim-date">Choose a date</label>
            <div><input id="claim-date" type="date" name="date" min="1900-01-01" max="2100-12-31" defaultValue={date} required /><button type="submit">Check date ↗</button></div>
          </form>
          {result.quote ? (
            <dl>
              <div><dt>Current claim</dt><dd>{result.quote.currentAmount ?? 'Available'}</dd></div>
              <div><dt>Minimum next claim</dt><dd>{result.quote.minimumAmount}</dd></div>
              <div><dt>Current holder</dt><dd>{result.quote.currentUsername ?? (result.quote.currentClaimId ? 'Private' : 'Nobody yet')}</dd></div>
            </dl>
          ) : null}
        </div>
      </header>

      {params.cancelled ? <div className="checkout-cancelled" role="status"><strong>Checkout was closed.</strong><span>No ownership change was recorded. Review the details whenever you’re ready.</span></div> : null}

      {result.quote ? (
        <div className="claim-workspace">
          <aside>
            <p className="eyebrow">Before you continue</p>
            <ol><li><span>01</span>The server checks the latest authoritative price.</li><li><span>02</span>Razorpay charges INR in India or USD internationally.</li><li><span>03</span>A signed webhook—not the browser—decides the claim.</li></ol>
            <p>If someone completes a valid claim first, your payment cannot replace the date and is automatically routed for refund.</p>
          </aside>
          <ClaimForm
            quote={result.quote}
            razorpayConfigured={getPaymentProvider().isConfigured()}
          />
        </div>
      ) : (
        <DataEmptyState unavailable title="Pricing is unavailable." message="We cannot verify the authoritative date state right now, so checkout is safely disabled." />
      )}

      <p className="claim-legal-note">By continuing, you agree that a claim is a non-refundable platform fee except where a verified payment cannot complete the requested claim. It creates no investment, resale, withdrawal, or payout right. <a href="/">Return home</a>.</p>
    </PublicPage>
  );
}
