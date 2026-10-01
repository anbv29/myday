import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DodoPaymentProvider } from '@/server/payments/dodo';

const secret = Buffer.from('test-only-webhook-key-32-bytes-long').toString('base64');
function signed(payload: unknown, seconds = Math.floor(Date.now() / 1000)) {
  const body = JSON.stringify(payload);
  const signature = createHmac('sha256', Buffer.from(secret, 'base64')).update(`evt_test.${seconds}.${body}`).digest('base64');
  return { body, headers: new Headers({ 'webhook-id': 'evt_test', 'webhook-timestamp': String(seconds), 'webhook-signature': `v1,${signature}` }) };
}
beforeEach(() => {
  vi.stubEnv('DODO_PAYMENTS_API_KEY', 'test-only-api-key');
  vi.stubEnv('DODO_PAYMENTS_WEBHOOK_KEY', `whsec_${secret}`);
  vi.stubEnv('DODO_PAYMENTS_ENVIRONMENT', 'test_mode');
});
afterEach(() => vi.unstubAllEnvs());
const provider = new DodoPaymentProvider();
const payment = { type: 'payment.succeeded', data: { status: 'succeeded', payment_id: 'pay_test', checkout_session_id: 'cks_test', total_amount: 100, currency: 'USD', settlement_amount: 80 } };

describe('Dodo signed events', () => {
  it.each(['USD', 'INR'])('uses the gross customer amount for %s, never settlement proceeds', async (currency) => {
    const { body, headers } = signed({ ...payment, data: { ...payment.data, currency } });
    expect(await provider.verifyWebhook(body, headers)).toEqual({ provider: 'dodo', eventId: 'evt_test', checkoutReference: 'cks_test', paymentReference: 'pay_test', amountMinor: 100, currency });
  });
  it('rejects body tampering', async () => {
    const { body, headers } = signed(payment);
    await expect(provider.verifyWebhook(body.replace('100', '999'), headers)).rejects.toThrow();
  });
  it('rejects timestamps outside the replay window', async () => {
    const { body, headers } = signed(payment, Math.floor(Date.now() / 1000) - 600);
    await expect(provider.verifyWebhook(body, headers)).rejects.toThrow();
  });
  it('rejects missing headers and payments without a session reference', async () => {
    await expect(provider.verifyWebhook('{}', new Headers())).rejects.toThrow('missing_dodo_signature');
    const { body, headers } = signed({ ...payment, data: { ...payment.data, checkout_session_id: null } });
    await expect(provider.verifyWebhook(body, headers)).rejects.toThrow('invalid_dodo_payment');
  });
  it('ignores failed payments without granting a claim', async () => {
    const { body, headers } = signed({ type: 'payment.failed', data: { payment_id: 'pay_test' } });
    expect(await provider.verifyWebhook(body, headers)).toBeNull();
  });
  it('recognizes confirmed full refunds', async () => {
    const { body, headers } = signed({ type: 'refund.succeeded', data: { status: 'succeeded', is_partial: false, payment_id: 'pay_test', refund_id: 'ref_test', amount: 100, currency: 'USD' } });
    expect(await provider.verifyWebhook(body, headers)).toMatchObject({ kind: 'refund', refundReference: 'ref_test', amountMinor: 100 });
  });
});
