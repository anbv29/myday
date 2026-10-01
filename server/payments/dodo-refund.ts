import type DodoPayments from 'dodopayments';
import { Redis } from '@upstash/redis';
import { requireServerEnv } from '@/lib/env';

export async function refundDodoPayment(client: DodoPayments, paymentId: string, amountMinor: number, intentId: string): Promise<string | null> {
  const redis = new Redis({ url: requireServerEnv('UPSTASH_REDIS_REST_URL'), token: requireServerEnv('UPSTASH_REDIS_REST_TOKEN') });
  // Cooldown survives request failure; it bounds concurrent requests and uncertain API timeouts.
  const locked = await redis.set(`myday:dodo:refund:${paymentId}`, intentId, { nx: true, ex: 60 });
  if (!locked) throw new Error('refund_retry_later');
  const payment = await client.payments.retrieve(paymentId);
  if (payment.payment_id !== paymentId || payment.total_amount !== amountMinor) throw new Error('refund_amount_mismatch');
  const existing = payment.refunds.find((refund) => refund.status !== 'failed');
  if (existing) {
    if (existing.is_partial || existing.amount !== amountMinor) throw new Error('refund_requires_manual_review');
    return existing.status === 'succeeded' ? existing.refund_id : null;
  }
  const refund = await client.refunds.create({
    payment_id: paymentId, reason: 'The date claim changed before payment completed.',
    metadata: { claim_intent_id: intentId },
  });
  if (!refund.refund_id || refund.is_partial || refund.status === 'failed') throw new Error('dodo_refund_failed');
  // A refund request is not a completed refund. The signed refund event completes pending refunds.
  return refund.status === 'succeeded' ? refund.refund_id : null;
}
