import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/claims/checkout/route';

const { rpc, configured, createCheckout, resumeCheckout, rateLimit } = vi.hoisted(() => ({ rpc: vi.fn(), configured: vi.fn(), createCheckout: vi.fn(), resumeCheckout: vi.fn(), rateLimit: vi.fn() }));
vi.mock('@/server/supabase/admin', () => ({ createAdminSupabaseClient: () => ({ rpc }) }));
vi.mock('@/server/payments', () => ({ selectPaymentProvider: () => ({ name: 'dodo', isConfigured: configured, createCheckout, resumeCheckout }) }));
vi.mock('@/server/rate-limit/checkout', () => ({ checkCheckoutRateLimit: rateLimit }));
const payload = { date: '2026-10-29', title: 'Birthday', story: 'A meaningful birthday.', attribution: '@example', visibility: 'public', amountMinor: 100, billingCountry: 'US', idempotencyKey: 'test-idempotency-key-12345' };
const row = { checkout_intent_id: 'intent_test', should_create_checkout: true, claim_status: 'creating_checkout', payment_provider: 'dodo', amount_minor: 150, currency: 'USD' };
const request = () => new Request('http://localhost:3000/api/claims/checkout', { method: 'POST', headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
  configured.mockReset().mockReturnValue(true); rateLimit.mockReset().mockResolvedValue({ success: true });
  rpc.mockReset().mockImplementation(async (name: string) => ({ data: name === 'create_anonymous_claim_checkout_intent' ? [row] : null, error: null }));
  createCheckout.mockReset().mockResolvedValue({ provider: 'dodo', checkoutReference: 'cks_test', url: 'https://test.checkout.dodopayments.com/session/cks_test', amountMinor: 150, currency: 'USD' });
  resumeCheckout.mockReset();
});
afterEach(() => vi.unstubAllEnvs());
describe('Dodo anonymous checkout endpoint', () => {
  it('uses database-authoritative pricing and an access-key protected return URL', async () => {
    const response = await POST(request()); expect(response.status).toBe(201);
    expect(createCheckout).toHaveBeenCalledWith(expect.objectContaining({ amountMinor: 150, currency: 'USD', returnUrl: 'http://localhost:3000/payment/status?intent=intent_test&access=test-idempotency-key-12345' }));
    expect(rpc).toHaveBeenCalledWith('attach_anonymous_claim_checkout', expect.objectContaining({ provider_checkout_reference: 'cks_test' }));
    expect(await response.json()).toMatchObject({ checkout: { provider: 'dodo' } });
  });
  it('fails closed on missing configuration before any database writes', async () => {
    configured.mockReturnValue(false);
    expect((await POST(request())).status).toBe(503); expect(rpc).not.toHaveBeenCalled();
  });
  it('detects a missing provider migration before calling Dodo', async () => {
    rpc.mockResolvedValue({ data: [{ ...row, payment_provider: 'razorpay' }], error: null });
    expect((await POST(request())).status).toBe(503); expect(createCheckout).not.toHaveBeenCalled();
  });
  it('does not return checkout if its reference could not be stored', async () => {
    rpc.mockImplementation(async (name: string) => ({ data: name === 'create_anonymous_claim_checkout_intent' ? [row] : null, error: name === 'attach_anonymous_claim_checkout' ? { message: 'unavailable' } : null }));
    expect((await POST(request())).status).toBe(500);
    expect(rpc).toHaveBeenCalledWith('fail_anonymous_claim_checkout', expect.anything());
  });
  it('reports authentication errors and fails the intent without granting a claim', async () => {
    createCheckout.mockRejectedValue(new Error('payment_provider_401'));
    expect((await POST(request())).status).toBe(401);
    expect(rpc).not.toHaveBeenCalledWith('finalize_verified_claim', expect.anything());
  });
});
