import type { VerifiedRefundEvent } from '@/server/payments/types';
import { createAdminSupabaseClient } from '@/server/supabase/admin';

export async function handleVerifiedRefund(event: VerifiedRefundEvent) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from('payment_records')
    .select('checkout_intent_id,amount_minor,currency,status')
    .eq('provider', event.provider).eq('provider_payment_id', event.paymentReference).maybeSingle();
  if (error || !data) throw new Error('refund_payment_lookup_unavailable');
  if (data.status === 'refunded') return Response.json({ received: true, refunded: true });
  if (data.status !== 'refund_pending' || Number(data.amount_minor) !== event.amountMinor || data.currency !== event.currency) {
    // Dashboard-initiated refunds of delivered claims require manual reconciliation.
    throw new Error('refund_requires_manual_reconciliation');
  }
  const marked = await admin.rpc('mark_claim_payment_refunded', {
    target_intent_id: data.checkout_intent_id, provider_refund_reference: event.refundReference,
  });
  if (marked.error) throw marked.error;
  return Response.json({ received: true, refunded: true });
}
