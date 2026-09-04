'use client';

import { useRef, useState } from 'react';
import type { ClaimQuote } from '@/server/claims/quotes';

type RazorpayPaymentResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailureResponse = {
  error?: { description?: string };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: RazorpayFailureResponse) => void) => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;
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
  error?: string;
  checkout?: { provider: 'razorpay'; checkoutReference: string; keyId: string; amountMinor: number; currency: string; name: string; description: string };
};

export function ClaimForm({
  quote,
  razorpayConfigured,
}: {
  quote: ClaimQuote;
  razorpayConfigured: boolean;
}) {
  const [billingCountry, setBillingCountry] = useState('IN');
  const [amountMajor, setAmountMajor] = useState(String(quote.minimumAmountMinor / 100));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestKey = useRef(crypto.randomUUID());
  const fxRate = quote.minimumAmountInrMinor && quote.minimumAmountMinor
    ? quote.minimumAmountInrMinor / quote.minimumAmountMinor
    : null;
  const numericAmountMajor = Number(amountMajor) || 0;
  const estimatedInr = fxRate
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(numericAmountMajor * fxRate)
    : null;
  const checkoutCurrency = billingCountry === 'IN' ? 'INR' : 'USD';

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
        handler: async (payment: RazorpayPaymentResponse) => {
          setSubmitting(true);
          try {
            const verification = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                intentId: result.intentId,
                accessKey: requestKey.current,
                ...payment,
              }),
            });
            const verificationResult = await verification.json() as { verified?: boolean; error?: string };
            if (!verification.ok || !verificationResult.verified) {
              setError(verificationResult.error ?? 'Payment verification failed. No claim has been granted.');
              return;
            }
            window.location.assign(result.statusUrl ?? `/payment/status?intent=${result.intentId}`);
          } catch {
            setError('Payment verification could not be completed. Check the payment status before retrying.');
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setError('Payment window closed. You have not been charged.');
          },
        },
      });
      razorpay.on('payment.failed', (failure) => {
        setSubmitting(false);
        setError(failure.error?.description ?? 'Payment failed. Try again or use another payment method.');
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
          <label>Claim value (USD benchmark)<input name="amount" type="number" required min={quote.minimumAmountMinor / 100} max={1_000_000} step="0.01" value={amountMajor} onChange={(event) => setAmountMajor(event.target.value)} /></label>
          <label>Billing country
            <select value={billingCountry} onChange={(event) => setBillingCountry(event.target.value)}>
              <option value="IN">India — pay in INR</option>
              <option value="US">United States / International — pay in USD</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="SG">Singapore</option>
            </select>
          </label>
        </div>
        <div className="checkout-summary">
          <p><span>Minimum valid claim</span><strong>{quote.minimumAmount}</strong></p>
          <p><span>{billingCountry === 'IN' ? 'Estimated INR checkout' : 'Checkout amount'}</span><strong>{billingCountry === 'IN' ? (estimatedInr ?? 'Live rate at checkout') : `$${numericAmountMajor.toFixed(2)}`}</strong></p>
          <p><span>Secure checkout</span><strong>Razorpay · {checkoutCurrency}</strong></p>
          <p><span>Ownership rule</span><strong>Verified webhook only</strong></p>
        </div>
        {billingCountry === 'IN' ? <p className="checkout-fineprint">The INR amount uses the latest daily ECB USD/INR reference available at checkout{quote.fxRateDate ? ` (reference date ${quote.fxRateDate})` : ''}. Razorpay receives the final server-calculated amount.</p> : null}
        <label className="claim-consent"><input type="checkbox" required /><span>I understand this is a platform fee for a featured claim—not an investment, resale right, wallet balance, or promise of financial return.</span></label>
        {error ? <div className="form-error" role="alert"><p>{error}</p></div> : null}
        {!razorpayConfigured ? <p className="provider-notice" role="status">Razorpay credentials are not connected in this environment, so real checkout is disabled.</p> : null}
        <button className="button button-primary checkout-button" type="submit" disabled={submitting || !razorpayConfigured}>
          <span>{submitting ? 'Opening secure checkout…' : 'Continue to secure checkout'}</span><span aria-hidden="true">↗</span>
        </button>
        <p className="checkout-fineprint">The server will re-check the latest date price before creating checkout. A return page never grants ownership; only a verified provider webhook can do that.</p>
      </fieldset>
    </form>
  );
}
