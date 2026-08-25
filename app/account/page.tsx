import type { Metadata } from 'next';
import { AccountFrame } from '@/components/account/account-frame';
import { AccountUnavailable } from '@/components/account/account-unavailable';
import { formatMoney } from '@/lib/public/format';
import { requireAccount } from '@/server/account/context';
import { accountCheckoutHref, getAccountCheckouts, getAccountClaims } from '@/server/account/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Account', robots: { index: false, follow: false } };

export default async function AccountPage() {
  const account = await requireAccount('/account');
  if (account.state !== 'ready') return <AccountUnavailable unconfigured={account.state === 'unconfigured'} />;
  const [claims, checkouts] = await Promise.all([
    getAccountClaims(account.supabase, 3),
    getAccountCheckouts(account.supabase, 4),
  ]);
  const summary = account.summary;

  return (
    <AccountFrame section="overview" username={summary.username}>
      <header className="account-hero">
        <div><p className="eyebrow">Account overview</p><h1>YOUR DAYS.<br />YOUR RECORD.</h1></div>
        <div><p>See the dates you own, track recent checkout activity, and keep your public identity current.</p><a className="button button-primary" href="/claim">Claim another date</a></div>
      </header>

      <section className="account-stats" aria-label="Account totals">
        <div><span>Current dates</span><strong>{summary.currentClaimCount.toLocaleString('en-US')}</strong></div>
        <div><span>Past claims</span><strong>{summary.historicalClaimCount.toLocaleString('en-US')}</strong></div>
        <div><span>Claim value</span><strong>{formatMoney(summary.totalClaimValueMinor)}</strong></div>
        <div><span>In progress</span><strong>{summary.openCheckoutCount.toLocaleString('en-US')}</strong></div>
      </section>

      <section className="account-panel">
        <div className="account-panel-heading"><div><p className="eyebrow">Latest ownership</p><h2>MY DATES</h2></div><a href="/account/dates">See all ↗</a></div>
        {claims.error ? <p className="account-empty" role="alert">Your dates could not be loaded right now.</p> : claims.data.length ? (
          <ul className="account-date-list">
            {claims.data.map((claim) => <li key={claim.claimId}><a href={`/day/${claim.date}`}><time dateTime={claim.date}>{claim.shortDate}</time><span><strong>{claim.title}</strong><small>{claim.isCurrent ? 'Current owner' : claim.status} · {claim.visibility}</small></span><b>{claim.amount}</b><i aria-hidden="true">↗</i></a></li>)}
          </ul>
        ) : <div className="account-empty"><p>No dates belong to this account yet.</p><a className="button" href="/claim">Find your date</a></div>}
      </section>

      <section className="account-panel">
        <div className="account-panel-heading"><div><p className="eyebrow">Payment trail</p><h2>RECENT ACTIVITY</h2></div><a href="/account/dates#checkout-activity">Full history ↗</a></div>
        {checkouts.error ? <p className="account-empty" role="alert">Checkout activity could not be loaded right now.</p> : checkouts.data.length ? (
          <ul className="checkout-activity-list">
            {checkouts.data.map((checkout) => { const href = accountCheckoutHref(checkout); return <li key={checkout.intentId}><div><strong>{checkout.fullDate}</strong><small>{checkout.title}</small></div><span>{checkout.amount}</span><span className={`account-status status-${checkout.status}`}>{checkout.status.replaceAll('_', ' ')}</span>{href ? <a href={href}>{checkout.status === 'completed' ? 'View' : 'Open'} ↗</a> : <span aria-hidden="true">—</span>}</li>; })}
          </ul>
        ) : <p className="account-empty">No checkout activity yet.</p>}
      </section>
    </AccountFrame>
  );
}
