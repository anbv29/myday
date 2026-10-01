import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleVerifiedRefund } from '@/server/payments/refund-event';
import type { VerifiedRefundEvent } from '@/server/payments/types';

const { rpc, lookup, eq } = vi.hoisted(() => ({ rpc: vi.fn(), lookup: vi.fn(), eq: vi.fn() }));
vi.mock('@/server/supabase/admin', () => ({ createAdminSupabaseClient: () => {
  const chain = { select: vi.fn().mockReturnThis(), eq: eq.mockReturnThis(), maybeSingle: lookup };
  return { rpc, from: () => chain };
} }));
const event: VerifiedRefundEvent = { kind: 'refund', provider: 'dodo', eventId: 'evt_test', paymentReference: 'pay_test', refundReference: 'ref_test', amountMinor: 100, currency: 'USD' };
const record = { checkout_intent_id: 'intent_test', status: 'refund_pending', amount_minor: 100, currency: 'USD' };
beforeEach(() => {
  lookup.mockReset().mockResolvedValue({ data: record, error: null });
  rpc.mockReset().mockResolvedValue({ error: null }); eq.mockClear();
});
describe('confirmed refund reconciliation', () => {
  it('matches the provider/payment and records a confirmed full refund', async () => {
    expect((await handleVerifiedRefund(event)).status).toBe(200);
    expect(eq).toHaveBeenCalledWith('provider', 'dodo'); expect(eq).toHaveBeenCalledWith('provider_payment_id', 'pay_test');
    expect(rpc).toHaveBeenCalledWith('mark_claim_payment_refunded', { target_intent_id: 'intent_test', provider_refund_reference: 'ref_test' });
  });
  it('acknowledges repeated completed refunds without another write', async () => {
    lookup.mockResolvedValue({ data: { ...record, status: 'refunded' }, error: null });
    expect((await handleVerifiedRefund(event)).status).toBe(200); expect(rpc).not.toHaveBeenCalled();
  });
  it.each([{ amount_minor: 200 }, { currency: 'INR' }, { status: 'captured' }])('requires manual reconciliation for %j', async (change) => {
    lookup.mockResolvedValue({ data: { ...record, ...change }, error: null });
    await expect(handleVerifiedRefund(event)).rejects.toThrow('refund_requires_manual_reconciliation'); expect(rpc).not.toHaveBeenCalled();
  });
  it('retries out-of-order events or database failures without claiming success', async () => {
    lookup.mockResolvedValue({ data: null, error: null });
    await expect(handleVerifiedRefund(event)).rejects.toThrow('refund_payment_lookup_unavailable');
    expect(rpc).not.toHaveBeenCalled();
  });
});
