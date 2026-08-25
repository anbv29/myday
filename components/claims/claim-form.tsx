'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import type { ClaimQuote } from '@/server/claims/quotes';

type RazorpayConstructor = new (options: Record<string, unknown>) => { open: () => void };
declare global { interface Window { Razorpay?: RazorpayConstructor } }

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>('script[data-myday-razorpay]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.mydayRazorpay = 'true';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

type CheckoutResponse = {
  intentId?: string;
  statusUrl?: string;
  action?: string;
  error?: string;
  checkout?:
    | { provider: 'stripe'; checkoutReference: string; redirectUrl: string }
    | { provider: 'razorpay'; checkoutReference: string; keyId: string; amountMinor: number; currency: string; name: string; description: string };
};

export function ClaimForm({
  quote,
  stripeConfigured,
  razorpayConfigured,
}: {
  quote: ClaimQuote;
  stripeConfigured: boolean;
  razorpayConfigured: boolean;
}) {
  const [billingCountry, setBillingCountry] = useState('US');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const requestKey = useRef(crypto.randomUUID());
  const selectedProvider = billingCountry === 'IN' ? 'Razorpay' : 'Stripe';
  const providerConfigured = billingCountry === 'IN' ? razorpayConfigured : stripeConfigured;

  async function submitClaim(formData: FormData) {
    setSubmitting(true);
    setError(null);
    setAction(null);
    const amountMajor = Number(formData.get('amount'));
    const payload = {
      date: quote.date,
      title: String(formData.get('title') ?? ''),
      story: String(formData.get('story') ?? ''),
      attribution: String(formData.get('attribution') ?? ''),
      visibility: String(formData.get('visibility') ?? ''),
      amountMinor: Math.round(amountMajor * 100),
      billingCountry,
      idempotencyKey: requestKey.current,
    };
    try {
      const response = await fetch('/api/claims/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as CheckoutResponse;
      if (!response.ok || !result.checkout) {
        setError(result.error ?? 'Checkout could not be started.');
        setAction(result.action ?? (response.status === 401 ? `/sign-in?redirect_url=${encodeURIComponent(`/claim?date=${quote.date}`)}` : null));
        if (response.status !== 409) requestKey.current = crypto.randomUUID();
        return;
      }

      if (result.checkout.provider === 'stripe') {
        window.location.assign(result.checkout.redirectUrl);
        return;
      }

      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) throw new Error('razorpay_script_unavailable');
      const checkout = result.checkout;
      const razorpay = new window.Razorpay({
        key: checkout.keyId,
        order_id: checkout.checkoutReference,
        amount: checkout.amountMinor,
        currency: checkout.currency,
        name: checkout.name,
        description: checkout.description,
        theme: { color: '#ff5833' },
        handler: () => window.location.assign(result.statusUrl ?? `/payment/status?intent=${result.intentId}`),
        modal: { ondismiss: () => setSubmitting(false) },
      });
      razorpay.open();
    } catch {
      setError('The secure payment window could not be opened. You have not been charged.');
      requestKey.current = crypto.randomUUID();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="claim-form"
      action={submitClaim}
      onChange={() => { requestKey.current = crypto.randomUUID(); setError(null); setAction(null); }}
    >
      <fieldset>
        <legend><span>01</span> Tell the story</legend>
        <label>Short title<input name="title" required minLength={3} maxLength={100} placeholder="Launching the company" /></label>
        <label>Why this day matters<textarea name="story" required minLength={3} maxLength={1000} rows={6} placeholder="I’ve been quietly building it for three years. This is the day it goes public." /></label>
        <label>Your public @ or link<input name="attribution" required minLength={3} maxLength={200} placeholder="@foundername or https://your-site.com" autoCapitalize="none" autoCorrect="off" spellCheck={false} /><small className="field-help">Shown with your claim on the leaderboard. Links must use HTTPS; private claims keep it hidden.</small></label>
      </fieldset>

      <fieldset>
        <legend><span>02</span> Choose visibility</legend>
        <div className="visibility-options">
          <label><input type="radio" name="visibility" value="public" defaultChecked /><span><strong>Public</strong><small>Eligible for profiles, search, activity, and the leaderboard.</small></span></label>
          <label><input type="radio" name="visibility" value="unlisted" /><span><strong>Unlisted</strong><small>Visible at the exact date URL, excluded from discovery.</small></span></label>
          <label><input type="radio" name="visibility" value="private" /><span><strong>Private</strong><small>Your story and username stay hidden from public visitors.</small></span></label>
        </div>
      </fieldset>

      <fieldset>
        <legend><span>03</span> Review the claim</legend>
        <div className="claim-payment-grid">
          <label>Claim amount (USD)<input name="amount" type="number" required min={quote.minimumAmountMinor / 100} max={1_000_000} step="0.01" defaultValue={quote.minimumAmountMinor / 100} /></label>
          <label>Billing country
            <select value={billingCountry} onChange={(event) => setBillingCountry(event.target.value)}>
              <option value="US">United States / International</option>
              <option value="IN">India</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="SG">Singapore</option>
            </select>
          </label>
        </div>
        <div className="checkout-summary">
          <p><span>Minimum valid claim</span><strong>{quote.minimumAmount}</strong></p>
          <p><span>Secure checkout</span><strong>{selectedProvider}</strong></p>
          <p><span>Ownership rule</span><strong>Verified webhook only</strong></p>
        </div>
        <label className="claim-consent"><input type="checkbox" required /><span>I understand this is a platform fee for a featured claim—not an investment, resale right, wallet balance, or promise of financial return.</span></label>
        {error ? <div className="form-error" role="alert"><p>{error}</p>{action ? <Link href={action}>Continue ↗</Link> : null}</div> : null}
        {!providerConfigured ? <p className="provider-notice" role="status">{selectedProvider} credentials are not connected in this environment, so real checkout is disabled.</p> : null}
        <button className="button button-primary checkout-button" type="submit" disabled={submitting || !providerConfigured}>
          <span>{submitting ? 'Opening secure checkout…' : 'Continue to secure checkout'}</span><span aria-hidden="true">↗</span>
        </button>
        <p className="checkout-fineprint">The server will re-check the latest date price before creating checkout. A return page never grants ownership; only a verified provider webhook can do that.</p>
      </fieldset>
    </form>
  );
}
