'use client';

import { useRef, useState } from 'react';
import type { ClaimQuote } from '@/server/claims/quotes';
import { isDodoCheckoutUrl } from '@/lib/payments/checkout-url';

type CheckoutResponse = {
  intentId?: string;
  statusUrl?: string;
  error?: string;
  checkout?: { provider: 'dodo'; checkoutReference: string; url: string; amountMinor: number; currency: string };
};

export function ClaimForm({
  quote,
  paymentConfigured,
}: {
  quote: ClaimQuote;
  paymentConfigured: boolean;
}) {
  const [billingCountry, setBillingCountry] = useState('IN');
  const [amountMajor, setAmountMajor] = useState(String(quote.minimumAmountMinor / 100));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestKey = useRef(crypto.randomUUID());
  const numericAmountMajor = Number(amountMajor) || 0;

  async function submitClaim(formData: FormData) {
    setSubmitting(true);
    setError(null);
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
        if (response.status !== 409) requestKey.current = crypto.randomUUID();
        return;
      }

      const checkout = result.checkout;
      if (checkout.provider !== 'dodo' || !isDodoCheckoutUrl(checkout.url)) throw new Error('invalid_checkout_url');
      // Redirect is never proof of payment; the return page polls authoritative server state.
      window.location.assign(checkout.url);
    } catch (checkoutError) {
      console.error('Dodo Payments Checkout could not be opened', checkoutError);
      setError('Secure checkout could not be opened. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="claim-form"
      action={submitClaim}
      onChange={() => { requestKey.current = crypto.randomUUID(); setError(null); }}
    >
      <fieldset>
        <legend><span>01</span> Tell the story</legend>
        <label>Short title<input name="title" required minLength={3} maxLength={100} placeholder="Launching the company" /></label>
        <label>Why this day matters<textarea name="story" required minLength={3} maxLength={1000} rows={6} placeholder="I’ve been quietly building it for three years. This is the day it goes public." /></label>
        <label>Your public @ or link<input name="attribution" required minLength={3} maxLength={200} placeholder="@foundername or https://your-site.com" autoCapitalize="none" autoCorrect="off" spellCheck={false} /><small className="field-help">No login required. This self-submitted attribution is shown on the leaderboard; it is not identity-verified. Links must use HTTPS, and private claims keep it hidden.</small></label>
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
          <label>Your payment (USD)<input name="amount" type="number" required min={quote.minimumAmountMinor / 100} max={1_000_000} step="0.01" value={amountMajor} onChange={(event) => setAmountMajor(event.target.value)} /></label>
          <label>Billing country
            <select value={billingCountry} onChange={(event) => setBillingCountry(event.target.value)}>
              <option value="IN">India</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="SG">Singapore</option>
            </select>
          </label>
        </div>
        <div className="checkout-summary">
          <p><span>Minimum valid claim</span><strong>{quote.minimumAmount}</strong></p>
          <p><span>Checkout amount</span><strong>${numericAmountMajor.toFixed(2)} USD</strong></p>
          <p><span>Secure checkout</span><strong>Dodo Payments · USD</strong></p>
          <p><span>Ownership rule</span><strong>Verified webhook only</strong></p>
        </div>
        <p className="checkout-fineprint">Choose your payment above the date’s minimum. Payments are charged in USD; your bank may apply currency conversion fees.</p>
        <label className="claim-consent"><input type="checkbox" required /><span>I understand this is a platform fee for a featured claim—not an investment, resale right, wallet balance, or promise of financial return.</span></label>
        {error ? <div className="form-error" role="alert"><p>{error}</p></div> : null}
        {!paymentConfigured ? <p className="provider-notice" role="status">Dodo Payments is not connected in this environment, so checkout is disabled.</p> : null}
        <button className="button button-primary checkout-button" type="submit" disabled={submitting || !paymentConfigured}>
          <span>{submitting ? 'Opening secure checkout…' : 'Continue to secure checkout'}</span><span aria-hidden="true">↗</span>
        </button>
        <p className="checkout-fineprint">You’ll continue to Dodo’s secure payment page. The server re-checks the date price first. Only a verified payment webhook can grant the claim.</p>
      </fieldset>
    </form>
  );
}
