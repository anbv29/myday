import { afterEach, describe, expect, it } from 'vitest';
import { selectPaymentProvider } from '@/server/payments';
import { RazorpayPaymentProvider } from '@/server/payments/razorpay';
import { StripePaymentProvider } from '@/server/payments/stripe';

async function hmacHex(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
  return Array.from(signature, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

afterEach(() => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
});

describe('payment routing', () => {
  it('routes Indian billing context to Razorpay and all other supported contexts to Stripe', () => {
    expect(selectPaymentProvider('IN').name).toBe('razorpay');
    expect(selectPaymentProvider('US').name).toBe('stripe');
    expect(selectPaymentProvider('GB').name).toBe('stripe');
  });
});

describe('Stripe webhook verification', () => {
  it('accepts a correctly signed paid checkout event', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'stripe_test_webhook_secret';
    const body = JSON.stringify({
      id: 'evt_123', type: 'checkout.session.completed',
      data: { object: { id: 'cs_123', payment_status: 'paid', payment_intent: 'pi_123', amount_total: 5500, currency: 'usd' } },
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = await hmacHex(`${timestamp}.${body}`, process.env.STRIPE_WEBHOOK_SECRET);
    const event = await new StripePaymentProvider().verifyWebhook(body, new Headers({ 'stripe-signature': `t=${timestamp},v1=${signature}` }));
    expect(event).toEqual({ provider: 'stripe', eventId: 'evt_123', checkoutReference: 'cs_123', paymentReference: 'pi_123', amountMinor: 5500, currency: 'USD' });
  });

  it('rejects a tampered payload', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'stripe_test_webhook_secret';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = await hmacHex(`${timestamp}.original`, process.env.STRIPE_WEBHOOK_SECRET);
    await expect(new StripePaymentProvider().verifyWebhook('tampered', new Headers({ 'stripe-signature': `t=${timestamp},v1=${signature}` }))).rejects.toThrow('invalid_stripe_signature');
  });
});

describe('Razorpay webhook verification', () => {
  it('accepts a correctly signed captured payment event', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'razorpay_test_webhook_secret';
    const body = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_123', order_id: 'order_123', amount: 467500, currency: 'INR' } } },
    });
    const signature = await hmacHex(body, process.env.RAZORPAY_WEBHOOK_SECRET);
    const event = await new RazorpayPaymentProvider().verifyWebhook(body, new Headers({
      'x-razorpay-signature': signature,
      'x-razorpay-event-id': 'event_123',
    }));
    expect(event).toEqual({ provider: 'razorpay', eventId: 'event_123', checkoutReference: 'order_123', paymentReference: 'pay_123', amountMinor: 467500, currency: 'INR' });
  });

  it('requires the provider event ID for replay protection', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'razorpay_test_webhook_secret';
    const body = JSON.stringify({ event: 'payment.captured' });
    const signature = await hmacHex(body, process.env.RAZORPAY_WEBHOOK_SECRET);
    await expect(new RazorpayPaymentProvider().verifyWebhook(body, new Headers({ 'x-razorpay-signature': signature }))).rejects.toThrow('missing_razorpay_signature');
  });
});
