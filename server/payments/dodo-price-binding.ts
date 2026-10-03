import { createHmac, timingSafeEqual } from 'node:crypto';
import { requireServerEnv } from '@/lib/env';

type Binding = { intentId: string; amountMinor: number; currency: 'INR' };
function digest(binding: Binding) {
  return createHmac('sha256', requireServerEnv('DODO_PAYMENTS_WEBHOOK_KEY'))
    .update(JSON.stringify(['myday-adaptive-v1', binding.intentId, binding.amountMinor, binding.currency]))
    .digest('hex');
}

export function bindDodoPrice(intentId: string, amountMinor: number) {
  const binding: Binding = { intentId, amountMinor, currency: 'INR' };
  return { claim_intent_id: intentId, base_amount_minor: String(amountMinor),
    billing_currency: binding.currency, price_binding: digest(binding) };
}

export function verifyDodoPriceBinding(metadata: Record<string, unknown>) {
  const intentId = metadata.claim_intent_id;
  const amountText = metadata.base_amount_minor;
  const signature = metadata.price_binding;
  if (typeof intentId !== 'string' || typeof amountText !== 'string' || !/^[1-9]\d*$/.test(amountText)
    || typeof signature !== 'string' || !/^[a-f0-9]{64}$/.test(signature) || metadata.billing_currency !== 'INR') {
    throw new Error('invalid_dodo_price_binding');
  }
  const amountMinor = Number(amountText);
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 100 || amountMinor > 100_000_000
    || !timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(digest({ intentId, amountMinor, currency: 'INR' }), 'hex'))) {
    throw new Error('invalid_dodo_price_binding');
  }
  return { intentId, amountMinor };
}
