'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { formatMoney } from '@/lib/public/format';

type IntentStatus = {
  intentId: string;
  date: string;
  title: string;
  amountMinor: number;
  currency: string;
  status: string;
  failureCode: string | null;
};

const terminalStatuses = new Set(['completed', 'refunded', 'failed', 'expired']);

export function PaymentStatus({ intentId }: { intentId: string }) {
  const [intent, setIntent] = useState<IntentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/payments/intents/${encodeURIComponent(intentId)}`, { cache: 'no-store' });
    const result = await response.json() as IntentStatus & { error?: string };
    if (!response.ok) { setError(result.error ?? 'Payment status could not be loaded.'); return null; }
    setIntent(result);
    setError(null);
    return result;
  }, [intentId]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      const result = await refresh();
      attempts += 1;
      if (!cancelled && result && !terminalStatuses.has(result.status) && attempts < 48) timeout = setTimeout(poll, 2500);
    };
    void poll();
    return () => { cancelled = true; if (timeout) clearTimeout(timeout); };
  }, [refresh]);

  if (error) return <div className="payment-state"><p className="eyebrow">Status unavailable</p><h1>WE COULDN’T<br />VERIFY IT YET.</h1><p>{error}</p><button className="button" type="button" onClick={() => void refresh()}>Try again</button></div>;
  if (!intent) return <div className="payment-state"><p className="eyebrow">Checking provider confirmation</p><h1>VERIFYING<br />PAYMENT.</h1><p>Keep this page open. Ownership has not changed yet.</p></div>;

  if (intent.status === 'completed') return <div className="payment-state success"><p className="eyebrow">Authoritatively confirmed</p><h1>THE DAY<br />IS YOURS.</h1><p>{intent.title} · {formatMoney(intent.amountMinor, intent.currency)}</p><Link className="button button-primary" href={`/day/${intent.date}`}>View the public record ↗</Link></div>;
  if (intent.status === 'refunded') return <div className="payment-state"><p className="eyebrow">Date state changed</p><h1>PAYMENT<br />REFUNDED.</h1><p>Another verified claim completed first. Your payment was refunded automatically.</p><Link className="button" href={`/claim?date=${intent.date}`}>See the latest price</Link></div>;
  if (intent.status === 'refund_pending' || intent.status === 'conflict') return <div className="payment-state warning"><p className="eyebrow">Date state changed</p><h1>REFUND IN<br />PROGRESS.</h1><p>Another verified claim completed first. Ownership was not changed and the refund is being processed.</p><button className="button" type="button" onClick={() => void refresh()}>Refresh status</button></div>;
  if (intent.status === 'failed' || intent.status === 'expired') return <div className="payment-state"><p className="eyebrow">Checkout ended</p><h1>NOT<br />CLAIMED.</h1><p>No ownership change was recorded.</p><Link className="button button-primary" href={`/claim?date=${intent.date}`}>Start a new checkout</Link></div>;

  return <div className="payment-state"><p className="eyebrow">Waiting for signed confirmation</p><h1>VERIFYING<br />PAYMENT.</h1><p>The provider return is not proof of payment. We’ll update this page after the signed webhook is processed.</p><dl><div><dt>Date</dt><dd>{intent.date}</dd></div><div><dt>Amount</dt><dd>{formatMoney(intent.amountMinor, intent.currency)}</dd></div><div><dt>Status</dt><dd>{intent.status.replaceAll('_', ' ')}</dd></div></dl><button className="button" type="button" onClick={() => void refresh()}>Check again</button></div>;
}
