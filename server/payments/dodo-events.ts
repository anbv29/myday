import type DodoPayments from 'dodopayments';
import type { VerifiedFailureEvent, VerifiedPaymentEvent, VerifiedRefundEvent } from '@/server/payments/types';

export function verifyDodoEvent(client: DodoPayments, rawBody: string, headers: Headers): VerifiedPaymentEvent | VerifiedRefundEvent | VerifiedFailureEvent | null {
  const eventId = headers.get('webhook-id');
  const timestamp = headers.get('webhook-timestamp');
  const signature = headers.get('webhook-signature');
  if (!eventId || !timestamp || !signature) throw new Error('missing_dodo_signature');
  // Official SDK verifies the untouched body, signature and timestamp/replay window.
  const event = client.webhooks.unwrap(rawBody, {
    headers: { 'webhook-id': eventId, 'webhook-timestamp': timestamp, 'webhook-signature': signature },
  });
  if (event.type === 'refund.succeeded') {
    const refund = event.data;
    if (refund.status !== 'succeeded' || refund.is_partial || !refund.payment_id || !refund.refund_id
      || !Number.isSafeInteger(refund.amount) || (refund.amount ?? 0) < 1 || !refund.currency) throw new Error('invalid_dodo_refund');
    return { kind: 'refund', provider: 'dodo', eventId, paymentReference: refund.payment_id,
      refundReference: refund.refund_id, amountMinor: refund.amount as number, currency: refund.currency };
  }
  if (event.type === 'payment.failed' || event.type === 'payment.cancelled') {
    if (!event.data.checkout_session_id) return null; // Unrelated payments have no MYDAY session.
    if (!['failed', 'cancelled'].includes(event.data.status ?? '')) throw new Error('invalid_dodo_failure');
    return { kind: 'failure', provider: 'dodo', eventId, checkoutReference: event.data.checkout_session_id };
  }
  if (event.type !== 'payment.succeeded') return null;
  const payment = event.data;
  if (payment.status !== 'succeeded' || !payment.checkout_session_id || !payment.payment_id
    || !Number.isSafeInteger(payment.total_amount) || payment.total_amount < 1 || !payment.currency) throw new Error('invalid_dodo_payment');
  return { provider: 'dodo', eventId, checkoutReference: payment.checkout_session_id,
    paymentReference: payment.payment_id, amountMinor: payment.total_amount, currency: payment.currency };
}
