import type DodoPayments from 'dodopayments';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isDodoCheckoutUrl } from '@/lib/payments/checkout-url';
import { createDodoCheckout, resumeDodoCheckout } from '@/server/payments/dodo-checkout';

const input = { intentId: 'intent_test', date: '2026-10-29', title: 'Birthday', amountMinor: 100,
  currency: 'USD', appUrl: 'https://myday.example', returnUrl: 'https://myday.example/payment/status?intent=intent_test&access=test-access' };
const price = { type: 'one_time_price', currency: 'USD', price: 100, pay_what_you_want: true, tax_inclusive: true };
const retrieveProduct = vi.fn(); const createSession = vi.fn(); const retrieveSession = vi.fn();
const client = { products: { retrieve: retrieveProduct }, checkoutSessions: { create: createSession, retrieve: retrieveSession } } as unknown as DodoPayments;
beforeEach(() => {
  vi.stubEnv('DODO_PAYMENTS_PRODUCT_ID_USD', 'pdt_usd');
  vi.stubEnv('DODO_PAYMENTS_ENVIRONMENT', 'test_mode');
  retrieveProduct.mockReset().mockResolvedValue({ price });
  createSession.mockReset().mockResolvedValue({ session_id: 'cks_test', checkout_url: 'https://test.checkout.dodopayments.com/session/cks_test' });
  retrieveSession.mockReset().mockResolvedValue({ id: 'cks_test', created_at: new Date().toISOString(), payment_status: null });
});
afterEach(() => vi.unstubAllEnvs());
describe('price-locked Dodo checkout', () => {
  it.each(['USD'])('sends the authoritative %s price with no browser discounts or currency changes', async (currency) => {
    retrieveProduct.mockResolvedValue({ price: { ...price, currency } });
    const result = await createDodoCheckout(client, { ...input, currency });
    expect(result).toMatchObject({ provider: 'dodo', amountMinor: 100, currency });
    expect(retrieveProduct).toHaveBeenCalledWith(`pdt_${currency.toLowerCase()}`);
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
      billing_currency: currency, return_url: input.returnUrl,
      product_cart: [{ product_id: `pdt_${currency.toLowerCase()}`, quantity: 1, amount: 100 }],
      feature_flags: { allow_currency_selection: false, allow_discount_code: false, redirect_immediately: true },
    }));
  });
  it('rejects unsupported INR pricing before contacting Dodo', async () => {
    await expect(createDodoCheckout(client, { ...input, currency: 'INR' })).rejects.toThrow('invalid_payment_currency');
    expect(retrieveProduct).not.toHaveBeenCalled();
  });
  it.each([0, 99, 100.5, NaN])('rejects invalid amount %s without an API request', async (amountMinor) => {
    await expect(createDodoCheckout(client, { ...input, amountMinor })).rejects.toThrow('invalid_payment_amount');
    expect(retrieveProduct).not.toHaveBeenCalled();
  });
  it.each([{ tax_inclusive: false }, { pay_what_you_want: false }, { currency: 'EUR' }, { purchasing_power_parity: true }, { discount_bps: 100 }, { price: 200 }])('rejects unsafe product pricing %j', async (change) => {
    retrieveProduct.mockResolvedValue({ price: { ...price, ...change } });
    await expect(createDodoCheckout(client, input)).rejects.toThrow('dodo_product_configuration_invalid');
    expect(createSession).not.toHaveBeenCalled();
  });
  it('rejects external return URLs', async () => {
    await expect(createDodoCheckout(client, { ...input, returnUrl: 'https://attacker.example' })).rejects.toThrow('invalid_return_url');
  });
  it('resumes the existing session without creating another payment', async () => {
    expect(await resumeDodoCheckout(client, 'cks_test', input)).toMatchObject({ url: 'https://test.checkout.dodopayments.com/session/cks_test' });
    expect(createSession).not.toHaveBeenCalled();
  });
  it('rejects expired or already paid sessions', async () => {
    retrieveSession.mockResolvedValue({ id: 'cks_test', created_at: new Date(0).toISOString() });
    await expect(resumeDodoCheckout(client, 'cks_test', input)).rejects.toThrow();
    retrieveSession.mockResolvedValue({ id: 'cks_test', created_at: new Date().toISOString(), payment_status: 'succeeded' });
    await expect(resumeDodoCheckout(client, 'cks_test', input)).rejects.toThrow();
  });
  it.each(['javascript:alert(1)', 'https://checkout.dodopayments.com.attacker.example/session/cks_test', 'http://checkout.dodopayments.com/session/cks_test', 'https://user:pass@checkout.dodopayments.com/session/cks_test'])('rejects untrusted checkout URL %s', (url) => {
    expect(isDodoCheckoutUrl(url)).toBe(false);
  });
});
