import { invalidatePublicClaimCache } from '@/server/cache/invalidation';
import { sha256Hex } from '@/server/payments/crypto';
import type { PaymentProvider } from '@/server/payments/types';
import { createAdminSupabaseClient } from '@/server/supabase/admin';

export async function handlePaymentWebhook(request: Request, provider: PaymentProvider) {
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (declaredLength > 1024 * 1024) return Response.json({ error: 'Payload too large.' }, { status: 413 });
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > 1024 * 1024) return Response.json({ error: 'Payload too large.' }, { status: 413 });

  let event;
  try {
    event = await provider.verifyWebhook(rawBody, request.headers);
  } catch (error) {
    console.warn('Payment webhook verification rejected', { provider: provider.name, error });
    return Response.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  }
  if (!event) return Response.json({ received: true, ignored: true });

  try {
    const admin = createAdminSupabaseClient();
    const payloadDigest = await sha256Hex(rawBody);
    const { data, error } = await admin.rpc('finalize_verified_claim', {
      payment_provider: event.provider,
      provider_event_reference: event.eventId,
      provider_checkout_reference: event.checkoutReference,
      provider_payment_reference: event.paymentReference,
      paid_amount_minor: event.amountMinor,
      paid_currency: event.currency,
      event_payload_digest: payloadDigest,
    });
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
    if (!row) throw new Error('missing_payment_transition');
    const outcome = String(row.transition_outcome);
    const intentStatus = String(row.intent_status);
    const intentId = String(row.checkout_intent_id);

    if (outcome === 'completed' || outcome === 'already_completed' || intentStatus === 'completed') {
      await invalidatePublicClaimCache();
      return Response.json({ received: true });
    }

    if (outcome === 'refund_required' || intentStatus === 'refund_pending') {
      const paymentReference = String(row.refund_payment_reference || event.paymentReference);
      const refundAmount = Number(row.refund_amount_minor || event.amountMinor);
      try {
        const refundReference = await provider.refund(paymentReference, refundAmount, intentId);
        const marked = await admin.rpc('mark_claim_payment_refunded', {
          target_intent_id: intentId,
          provider_refund_reference: refundReference,
        });
        if (marked.error) throw marked.error;
        return Response.json({ received: true, refunded: true });
      } catch (refundError) {
        console.error('Verified stale payment requires refund retry', { provider: provider.name, intentId, error: refundError });
        return Response.json({ error: 'Refund processing will be retried.' }, { status: 503 });
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Verified payment webhook processing failed', { provider: provider.name, error });
    return Response.json({ error: 'Webhook processing failed.' }, { status: 503 });
  }
}
