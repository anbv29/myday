import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handlePaymentWebhook } from '@/server/payments/webhook';
import type { PaymentProvider } from '@/server/payments/types';

const { rpc, invalidate, from, lookup, update } = vi.hoisted(() => ({ rpc: vi.fn(), invalidate: vi.fn(), from: vi.fn(), lookup: vi.fn(), update: vi.fn() }));
vi.mock('@/server/supabase/admin', () => ({ createAdminSupabaseClient: () => ({ rpc, from }) }));
vi.mock('@/server/cache/invalidation', () => ({ invalidatePublicClaimCache: invalidate }));
const verify = vi.fn(); const refund = vi.fn();
const provider: PaymentProvider = { name: 'dodo', isConfigured: () => true, createCheckout: vi.fn(), resumeCheckout: vi.fn(), verifyWebhook: verify, refund };
const event = { provider: 'dodo', eventId: 'evt_test', checkoutReference: 'cks_test', paymentReference: 'pay_test', amountMinor: 100, currency: 'USD' };
const request = () => new Request('http://localhost/api/webhooks/dodo', { method: 'POST', body: '{}' });
beforeEach(() => {
  verify.mockReset().mockResolvedValue(event); refund.mockReset().mockResolvedValue(null);
  invalidate.mockReset().mockResolvedValue(undefined);
  rpc.mockReset().mockResolvedValue({ data: [{ transition_outcome: 'completed', intent_status: 'completed', checkout_intent_id: 'intent_test' }], error: null });
  const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: lookup, update: vi.fn().mockReturnThis(), in: update };
  from.mockReset().mockReturnValue(chain); lookup.mockReset(); update.mockReset().mockResolvedValue({ error: null });
});
describe('Dodo webhook claim boundary', () => {
  it('never writes when signature verification fails', async () => {
    verify.mockRejectedValue(new Error('invalid_signature'));
    expect((await handlePaymentWebhook(request(), provider)).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled(); expect(from).not.toHaveBeenCalled();
  });
  it('finalizes the exact gross amount and invalidates public caches after commit', async () => {
    expect((await handlePaymentWebhook(request(), provider)).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('finalize_verified_claim', expect.objectContaining({ payment_provider: 'dodo', provider_checkout_reference: 'cks_test', paid_amount_minor: 100, paid_currency: 'USD' }));
    expect(invalidate).toHaveBeenCalledOnce(); expect(refund).not.toHaveBeenCalled();
  });
  it('leaves stale payments pending until refunds are actually confirmed', async () => {
    rpc.mockResolvedValue({ data: [{ transition_outcome: 'refund_required', intent_status: 'refund_pending', checkout_intent_id: 'intent_test', refund_payment_reference: 'pay_test', refund_amount_minor: 100 }], error: null });
    const response = await handlePaymentWebhook(request(), provider);
    expect(await response.json()).toMatchObject({ refundPending: true });
    expect(refund).toHaveBeenCalledWith('pay_test', 100, 'intent_test');
    expect(rpc).toHaveBeenCalledTimes(1); expect(invalidate).not.toHaveBeenCalled();
  });
  it('binds the INR receipt to its canonical USD intent atomically', async () => {
    verify.mockResolvedValue({ ...event, currency: 'INR', amountMinor: 9500,
      adaptivePrice: { intentId: 'intent_test', amountMinor: 100 } });
    expect((await handlePaymentWebhook(request(), provider)).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('finalize_adaptive_dodo_claim', expect.objectContaining({
      bound_intent_id: 'intent_test', base_amount_minor: 100, paid_amount_minor: 9500, paid_currency: 'INR',
    }));
  });
  it('refunds the actual INR receipt rather than the USD ranking amount', async () => {
    verify.mockResolvedValue({ ...event, currency: 'INR', amountMinor: 9500,
      adaptivePrice: { intentId: 'intent_test', amountMinor: 100 } });
    rpc.mockResolvedValue({ data: [{ transition_outcome: 'refund_required', intent_status: 'refund_pending', checkout_intent_id: 'intent_test', refund_amount_minor: 9500 }], error: null });
    await handlePaymentWebhook(request(), provider);
    expect(refund).toHaveBeenCalledWith('pay_test', 9500, 'intent_test');
  });
  it('requests retries on database outages', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'unavailable' } });
    expect((await handlePaymentWebhook(request(), provider)).status).toBe(503);
    expect(refund).not.toHaveBeenCalled();
  });
  it('protects completed intents when processing a late failure', async () => {
    verify.mockResolvedValue({ kind: 'failure', provider: 'dodo', eventId: 'evt_test', checkoutReference: 'cks_test' });
    expect((await handlePaymentWebhook(request(), provider)).status).toBe(200);
    expect(update).toHaveBeenCalledWith('status', ['checkout_created']); expect(rpc).not.toHaveBeenCalled();
  });
});
