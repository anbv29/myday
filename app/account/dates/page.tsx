import type { Metadata } from 'next';
import Link from 'next/link';
import { AccountFrame } from '@/components/account/account-frame';
import { AccountUnavailable } from '@/components/account/account-unavailable';
import { requireAccount } from '@/server/account/context';
import { accountCheckoutHref, getAccountCheckouts, getAccountClaims, type AccountClaim } from '@/server/account/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My dates', robots: { index: false, follow: false } };

function ClaimCollection({ claims, empty }: { claims: AccountClaim[]; empty: string }) {
  if (!claims.length) return <p className="account-empty">{empty}</p>;
  return <ul className="owned-date-grid">{claims.map((claim) => <li key={claim.claimId}><Link href={`/day/${claim.date}`}><time dateTime={claim.date}>{claim.shortDate}</time><h3>{claim.title}</h3><p>{claim.story}</p><dl><div><dt>Paid</dt><dd>{claim.amount}</dd></div><div><dt>Credit</dt><dd>{claim.attribution}</dd></div><div><dt>Visibility</dt><dd>{claim.visibility}</dd></div></dl><span>{claim.isCurrent ? 'View owned date' : `${claim.status} claim`} ↗</span></Link></li>)}</ul>;
}

export default async function MyDatesPage() {
  const account = await requireAccount('/account/dates');
  if (account.state !== 'ready') return <AccountUnavailable unconfigured={account.state === 'unconfigured'} />;
  const [claims, checkouts] = await Promise.all([getAccountClaims(account.supabase, 100), getAccountCheckouts(account.supabase, 50)]);
  const currentClaims = claims.data.filter((claim) => claim.isCurrent && claim.status === 'current');
  const pastClaims = claims.data.filter((claim) => !claim.isCurrent || claim.status !== 'current');

  return (
    <AccountFrame section="dates" username={account.summary.username}>
      <header className="account-page-heading"><p className="eyebrow">Ownership ledger</p><h1>MY DATES</h1><p>Every completed claim tied to your verified account, including dates another collector later replaced.</p></header>
      {claims.error ? <p className="account-empty" role="alert">Your ownership ledger could not be loaded right now.</p> : <>
        <section className="account-panel"><div className="account-panel-heading"><div><p className="eyebrow">Current</p><h2>OWNED NOW</h2></div><span>{currentClaims.length} total</span></div><ClaimCollection claims={currentClaims} empty="You do not currently own a date." /></section>
        <section className="account-panel"><div className="account-panel-heading"><div><p className="eyebrow">Permanent record</p><h2>CLAIM HISTORY</h2></div><span>{pastClaims.length} total</span></div><ClaimCollection claims={pastClaims} empty="No earlier claims yet." /></section>
      </>}
      <section className="account-panel" id="checkout-activity">
        <div className="account-panel-heading"><div><p className="eyebrow">Provider-verified states</p><h2>CHECKOUT ACTIVITY</h2></div><span>{checkouts.data.length} shown</span></div>
        {checkouts.error ? <p className="account-empty" role="alert">Checkout activity could not be loaded right now.</p> : checkouts.data.length ? <ul className="checkout-activity-list">{checkouts.data.map((checkout) => { const href = accountCheckoutHref(checkout); return <li key={checkout.intentId}><div><strong>{checkout.fullDate}</strong><small>{checkout.title}</small></div><span>{checkout.amount}</span><span className={`account-status status-${checkout.status}`}>{checkout.status.replaceAll('_', ' ')}</span>{href ? <Link href={href}>{checkout.status === 'completed' ? 'View' : 'Open'} ↗</Link> : <span aria-hidden="true">—</span>}</li>; })}</ul> : <p className="account-empty">No checkout activity yet.</p>}
      </section>
    </AccountFrame>
  );
}
