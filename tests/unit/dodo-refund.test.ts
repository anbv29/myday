import type DodoPayments from 'dodopayments';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { refundDodoPayment } from '@/server/payments/dodo-refund';

const { lock } = vi.hoisted(() => ({ lock: vi.fn() }));
vi.mock('@upstash/redis', () => ({ Redis: class { set = lock; } }));
const retrieve = vi.fn(); const create = vi.fn();
const client = { payments: { retrieve }, refunds: { create } } as unknown as DodoPayments;
beforeEach(() => {
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://test.upstash.io'); vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-only');
  lock.mockReset().mockResolvedValue('OK');
  retrieve.mockReset().mockResolvedValue({ payment_id: 'pay_test', total_amount: 100, refunds: [] });
  create.mockReset().mockResolvedValue({ refund_id: 'ref_test', status: 'pending', is_partial: false });
});
afterEach(() => vi.unstubAllEnvs());
describe('Dodo full refund safety', () => {
  it('requests a full refund once and does not claim a pending refund succeeded', async () => {
    expect(await refundDodoPayment(client, 'pay_test', 100, 'intent_test')).toBeNull();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ payment_id: 'pay_test', metadata: { claim_intent_id: 'intent_test' } }));
    expect(lock).toHaveBeenCalledWith('myday:dodo:refund:pay_test', 'intent_test', { nx: true, ex: 60 });
  });
  it('does not send concurrent refund requests', async () => {
    lock.mockResolvedValue(null);
    await expect(refundDodoPayment(client, 'pay_test', 100, 'intent_test')).rejects.toThrow('refund_retry_later');
    expect(create).not.toHaveBeenCalled();
  });
  it.each(['pending', 'review', 'succeeded'])('reuses an existing %s full refund', async (status) => {
    retrieve.mockResolvedValue({ payment_id: 'pay_test', total_amount: 100, refunds: [{ refund_id: 'ref_existing', status, is_partial: false, amount: 100 }] });
    expect(await refundDodoPayment(client, 'pay_test', 100, 'intent_test')).toBe(status === 'succeeded' ? 'ref_existing' : null);
    expect(create).not.toHaveBeenCalled();
  });
  it('refuses a mismatched amount instead of refunding the wrong sum', async () => {
    await expect(refundDodoPayment(client, 'pay_test', 200, 'intent_test')).rejects.toThrow('refund_amount_mismatch');
    expect(create).not.toHaveBeenCalled();
  });
  it('requires manual review after an existing partial refund', async () => {
    retrieve.mockResolvedValue({ payment_id: 'pay_test', total_amount: 100, refunds: [{ refund_id: 'ref_partial', status: 'succeeded', is_partial: true, amount: 50 }] });
    await expect(refundDodoPayment(client, 'pay_test', 100, 'intent_test')).rejects.toThrow('refund_requires_manual_review');
    expect(create).not.toHaveBeenCalled();
  });
  it('does not mark failed provider refunds complete', async () => {
    create.mockResolvedValue({ refund_id: 'ref_test', status: 'failed' });
    await expect(refundDodoPayment(client, 'pay_test', 100, 'intent_test')).rejects.toThrow('dodo_refund_failed');
  });
});
