import { isEnvValuePresent, requireServerEnv } from '@/lib/env';
import { verifyHmacSha256 } from '@/server/payments/crypto';
import { paymentFetch } from '@/server/payments/http';
import type { CheckoutCreation, ClientCheckout, PaymentProvider, VerifiedPaymentEvent } from '@/server/payments/types';

function basicAuthorization() {
  return `Basic ${btoa(`${requireServerEnv('RAZORPAY_KEY_ID')}:${requireServerEnv('RAZORPAY_KEY_SECRET')}`)}`;
}

function razorpayHeaders() {
  return { Authorization: basicAuthorization(), 'Content-Type': 'application/json' };
}

function clientCheckout(reference: string, input: CheckoutCreation): ClientCheckout {
  return {
    provider: 'razorpay',
    checkoutReference: reference,
    keyId: requireServerEnv('RAZORPAY_KEY_ID'),
    amountMinor: input.amountMinor,
    currency: input.currency,
    name: 'MYDAY',
    description: `Claim ${input.date} · ${input.title}`,
  };
}

export async function verifyRazorpayCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
) {
  return verifyHmacSha256(
    `${orderId}|${paymentId}`,
    requireServerEnv('RAZORPAY_KEY_SECRET'),
    signature,
  );
}

export class RazorpayPaymentProvider implements PaymentProvider {
  readonly name = 'razorpay' as const;

  isConfigured() {
    return isEnvValuePresent(process.env.RAZORPAY_KEY_ID)
      && isEnvValuePresent(process.env.RAZORPAY_KEY_SECRET)
      && isEnvValuePresent(process.env.RAZORPAY_WEBHOOK_SECRET);
  }

  async createCheckout(input: CheckoutCreation) {
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 100) {
      throw new Error('invalid_payment_amount');
    }
    const data = await paymentFetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: razorpayHeaders(),
      body: JSON.stringify({
        amount: input.amountMinor,
        currency: input.currency,
        receipt: input.intentId,
        notes: { claim_intent_id: input.intentId, date: input.date },
      }),
    });
    if (typeof data.id !== 'string') throw new Error('razorpay_order_missing_id');
    return clientCheckout(data.id, input);
  }

  async resumeCheckout(reference: string, input: CheckoutCreation) {
    return clientCheckout(reference, input);
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedPaymentEvent | null> {
    const signature = headers.get('x-razorpay-signature');
    const eventId = headers.get('x-razorpay-event-id');
    if (!signature || !eventId) throw new Error('missing_razorpay_signature');
    const verified = await verifyHmacSha256(rawBody, requireServerEnv('RAZORPAY_WEBHOOK_SECRET'), signature);
    if (!verified) throw new Error('invalid_razorpay_signature');

    const event = JSON.parse(rawBody) as Record<string, unknown>;
    if (event.event !== 'payment.captured') return null;
    const payload = event.payload as Record<string, unknown> | undefined;
    const paymentWrapper = payload?.payment as Record<string, unknown> | undefined;
    const payment = paymentWrapper?.entity as Record<string, unknown> | undefined;
    if (!payment) throw new Error('invalid_razorpay_event');
    const checkoutReference = typeof payment.order_id === 'string' ? payment.order_id : '';
    const paymentReference = typeof payment.id === 'string' ? payment.id : '';
    const amountMinor = typeof payment.amount === 'number' ? payment.amount : 0;
    const currency = typeof payment.currency === 'string' ? payment.currency.toUpperCase() : '';
    if (!checkoutReference || !paymentReference || !amountMinor || !currency) throw new Error('invalid_razorpay_event');
    return { provider: 'razorpay', eventId, checkoutReference, paymentReference, amountMinor, currency };
  }

  async refund(paymentReference: string, amountMinor: number, intentId: string) {
    const data = await paymentFetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentReference)}/refund`, {
      method: 'POST',
      headers: razorpayHeaders(),
      body: JSON.stringify({
        amount: amountMinor,
        speed: 'normal',
        receipt: intentId,
        notes: { claim_intent_id: intentId, reason: 'claim_state_changed' },
      }),
    }, 3000);
    if (typeof data.id !== 'string') throw new Error('razorpay_refund_missing_id');
    return data.id;
  }
}
