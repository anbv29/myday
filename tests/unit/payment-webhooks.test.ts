import { afterEach, describe, expect, it } from 'vitest';
import { selectPaymentProvider } from '@/server/payments';
import { RazorpayPaymentProvider } from '@/server/payments/razorpay';

async function hmacHex(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
  return Array.from(signature, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

afterEach(() => {
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
});

describe('payment routing', () => {
  it('routes Indian and international billing contexts to Razorpay', () => {
    expect(selectPaymentProvider('IN').name).toBe('razorpay');
    expect(selectPaymentProvider('US').name).toBe('razorpay');
    expect(selectPaymentProvider('GB').name).toBe('razorpay');
  });
});

describe('Razorpay webhook verification', () => {
  it.each([
    { amount: 9575, currency: 'INR' },
    { amount: 100, currency: 'USD' },
  ])('accepts a correctly signed $currency captured payment event', async ({ amount, currency }) => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'razorpay_test_webhook_secret';
    const body = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_123', order_id: 'order_123', amount, currency } } },
    });
    const signature = await hmacHex(body, process.env.RAZORPAY_WEBHOOK_SECRET);
    const event = await new RazorpayPaymentProvider().verifyWebhook(body, new Headers({
      'x-razorpay-signature': signature,
      'x-razorpay-event-id': 'event_123',
    }));
    expect(event).toEqual({ provider: 'razorpay', eventId: 'event_123', checkoutReference: 'order_123', paymentReference: 'pay_123', amountMinor: amount, currency });
  });

  it('requires the provider event ID for replay protection', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'razorpay_test_webhook_secret';
    const body = JSON.stringify({ event: 'payment.captured' });
    const signature = await hmacHex(body, process.env.RAZORPAY_WEBHOOK_SECRET);
    await expect(new RazorpayPaymentProvider().verifyWebhook(body, new Headers({ 'x-razorpay-signature': signature }))).rejects.toThrow('missing_razorpay_signature');
  });
});
