import type DodoPayments from 'dodopayments';
import { requireServerEnv } from '@/lib/env';
import { isDodoCheckoutUrl } from '@/lib/payments/checkout-url';
import type { CheckoutCreation, ClientCheckout } from '@/server/payments/types';

export async function createDodoCheckout(client: DodoPayments, input: CheckoutCreation): Promise<ClientCheckout> {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 100) throw new Error('invalid_payment_amount');
  if (input.currency !== 'USD' && input.currency !== 'INR') throw new Error('invalid_payment_currency');
  if (!input.returnUrl || new URL(input.returnUrl).origin !== new URL(input.appUrl).origin) throw new Error('invalid_return_url');
  const productId = requireServerEnv(`DODO_PAYMENTS_PRODUCT_ID_${input.currency}`);
  const product = await client.products.retrieve(productId);
  const price = product.price;
  // The database verifies the exact gross amount; tax/FX/discount changes must not change it.
  if (price.type !== 'one_time_price' || !price.pay_what_you_want || !price.tax_inclusive
    || price.currency !== input.currency || price.purchasing_power_parity
    || price.discount || price.discount_bps || price.price > input.amountMinor) {
    throw new Error('dodo_product_configuration_invalid');
  }
  const session = await client.checkoutSessions.create({
    product_cart: [{ product_id: productId, quantity: 1, amount: input.amountMinor }],
    billing_currency: input.currency,
    return_url: input.returnUrl,
    metadata: { claim_intent_id: input.intentId, date: input.date },
    feature_flags: { allow_currency_selection: false, allow_discount_code: false, redirect_immediately: true },
    minimal_address: true,
    short_link: false,
  });
  if (!session.session_id || !session.checkout_url || !isDodoCheckoutUrl(session.checkout_url)) throw new Error('invalid_dodo_checkout');
  return { provider: 'dodo', checkoutReference: session.session_id, url: session.checkout_url, amountMinor: input.amountMinor, currency: input.currency };
}

export async function resumeDodoCheckout(client: DodoPayments, reference: string, input: CheckoutCreation): Promise<ClientCheckout> {
  if (!/^[A-Za-z0-9_-]+$/.test(reference)) throw new Error('invalid_dodo_session');
  const session = await client.checkoutSessions.retrieve(reference);
  const createdAt = Date.parse(session.created_at);
  if (session.id !== reference || ['succeeded', 'failed', 'cancelled'].includes(session.payment_status ?? '')
    || !Number.isFinite(createdAt) || Date.now() - createdAt >= 24 * 60 * 60 * 1000) throw new Error('dodo_session_expired_or_paid');
  const host = process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode' ? 'checkout.dodopayments.com' : 'test.checkout.dodopayments.com';
  return { provider: 'dodo', checkoutReference: reference, url: `https://${host}/session/${reference}`, amountMinor: input.amountMinor, currency: input.currency };
}
