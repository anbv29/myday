import { requireServerEnv } from '@/lib/env';
import { verifyHmacSha256 } from '@/server/payments/crypto';
import { paymentFetch } from '@/server/payments/http';
import type { CheckoutCreation, ClientCheckout, PaymentProvider, VerifiedPaymentEvent } from '@/server/payments/types';

function configured(value: string | undefined) {
  return Boolean(value && !value.includes('replace_me'));
}

function stripeHeaders(idempotencyKey?: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${requireServerEnv('STRIPE_SECRET_KEY')}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Stripe-Version': '2026-02-25.clover',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  return headers;
}

function stripeCheckout(data: Record<string, unknown>) {
  const reference = typeof data.id === 'string' ? data.id : '';
  const url = typeof data.url === 'string' ? data.url : '';
  if (!reference || !url) throw new Error('stripe_checkout_missing_url');
  return { provider: 'stripe', checkoutReference: reference, redirectUrl: url } satisfies ClientCheckout;
}

export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe' as const;

  isConfigured() {
    return configured(process.env.STRIPE_SECRET_KEY) && configured(process.env.STRIPE_WEBHOOK_SECRET);
  }

  async createCheckout(input: CheckoutCreation) {
    const form = new URLSearchParams({
      mode: 'payment',
      'payment_method_types[0]': 'card',
      billing_address_collection: 'required',
      success_url: `${input.appUrl}/payment/status?intent=${encodeURIComponent(input.intentId)}`,
      cancel_url: `${input.appUrl}/claim?date=${encodeURIComponent(input.date)}&cancelled=1`,
      client_reference_id: input.intentId,
      'metadata[claim_intent_id]': input.intentId,
      'payment_intent_data[metadata][claim_intent_id]': input.intentId,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': input.currency.toLowerCase(),
      'line_items[0][price_data][unit_amount]': String(input.amountMinor),
      'line_items[0][price_data][product_data][name]': `Claim ${input.date} on MYDAY.LOL`,
      'line_items[0][price_data][product_data][description]': input.title,
    });
    const data = await paymentFetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST', headers: stripeHeaders(`claim-checkout-${input.intentId}`), body: form,
    });
    return stripeCheckout(data);
  }

  async resumeCheckout(reference: string) {
    const data = await paymentFetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(reference)}`, {
      method: 'GET', headers: stripeHeaders(),
    });
    return stripeCheckout(data);
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedPaymentEvent | null> {
    const signatureHeader = headers.get('stripe-signature');
    if (!signatureHeader) throw new Error('missing_stripe_signature');
    const parts = signatureHeader.split(',').map((part) => part.split('='));
    const timestamp = parts.find(([key]) => key === 't')?.[1];
    const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
    if (!timestamp || signatures.length === 0 || !/^\d+$/.test(timestamp)) throw new Error('invalid_stripe_signature');
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new Error('expired_stripe_signature');
    const signedPayload = `${timestamp}.${rawBody}`;
    const secret = requireServerEnv('STRIPE_WEBHOOK_SECRET');
    const matches = await Promise.all(signatures.map((signature) => verifyHmacSha256(signedPayload, secret, signature)));
    if (!matches.some(Boolean)) throw new Error('invalid_stripe_signature');

    const event = JSON.parse(rawBody) as Record<string, unknown>;
    if (event.type !== 'checkout.session.completed') return null;
    const data = event.data as Record<string, unknown> | undefined;
    const session = data?.object as Record<string, unknown> | undefined;
    if (!session || session.payment_status !== 'paid') return null;
    const paymentReference = typeof session.payment_intent === 'string' ? session.payment_intent : '';
    const checkoutReference = typeof session.id === 'string' ? session.id : '';
    const eventId = typeof event.id === 'string' ? event.id : '';
    const amountMinor = typeof session.amount_total === 'number' ? session.amount_total : 0;
    const currency = typeof session.currency === 'string' ? session.currency.toUpperCase() : '';
    if (!eventId || !checkoutReference || !paymentReference || !amountMinor || !currency) throw new Error('invalid_stripe_event');
    return { provider: 'stripe', eventId, checkoutReference, paymentReference, amountMinor, currency };
  }

  async refund(paymentReference: string, amountMinor: number, intentId: string) {
    const form = new URLSearchParams({
      payment_intent: paymentReference,
      amount: String(amountMinor),
      reason: 'requested_by_customer',
      'metadata[claim_intent_id]': intentId,
      'metadata[reason]': 'claim_state_changed',
    });
    const data = await paymentFetch('https://api.stripe.com/v1/refunds', {
      method: 'POST', headers: stripeHeaders(`claim-refund-${intentId}`), body: form,
    }, 3000);
    if (typeof data.id !== 'string') throw new Error('stripe_refund_missing_id');
    return data.id;
  }
}
