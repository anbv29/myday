import { z } from 'zod';
import { hasTrustedMutationOrigin, readBoundedBody } from '@/server/http/security';
import { verifyRazorpayCheckoutSignature } from '@/server/payments/razorpay';
import { createAdminSupabaseClient } from '@/server/supabase/admin';

const MAX_BODY_BYTES = 4 * 1024;
const accessPattern = /^[A-Za-z0-9_-]{16,100}$/;
const orderIdPattern = /^order_[A-Za-z0-9]{6,255}$/;
const paymentIdPattern = /^pay_[A-Za-z0-9]{6,255}$/;

const paymentVerificationSchema = z.object({
  intentId: z.string().uuid(),
  accessKey: z.string().regex(accessPattern),
  razorpay_payment_id: z.string().regex(paymentIdPattern),
  razorpay_order_id: z.string().regex(orderIdPattern),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
}).strict();

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) {
    return Response.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = JSON.parse(await readBoundedBody(request, MAX_BODY_BYTES));
  } catch (error) {
    const status = error instanceof SyntaxError ? 400 : 413;
    return Response.json(
      { error: status === 413 ? 'Request is too large.' : 'Invalid JSON body.' },
      { status },
    );
  }

  const parsed = paymentVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Missing or invalid payment verification fields.' }, { status: 400 });
  }

  const { data, error } = await createAdminSupabaseClient()
    .from('claim_checkout_intents')
    .select('provider_checkout_id,status')
    .eq('id', parsed.data.intentId)
    .eq('idempotency_key', parsed.data.accessKey)
    .maybeSingle();

  if (error) {
    console.error('Payment verification lookup failed', { error });
    return Response.json({ error: 'Payment verification is temporarily unavailable.' }, { status: 503 });
  }
  if (!data?.provider_checkout_id) {
    return Response.json({ error: 'Payment checkout was not found.' }, { status: 404 });
  }
  if (data.provider_checkout_id !== parsed.data.razorpay_order_id) {
    return Response.json({ error: 'Payment signature verification failed.' }, { status: 400 });
  }

  const verified = await verifyRazorpayCheckoutSignature(
    data.provider_checkout_id,
    parsed.data.razorpay_payment_id,
    parsed.data.razorpay_signature,
  );
  if (!verified) {
    return Response.json({ error: 'Payment signature verification failed.' }, { status: 400 });
  }

  return Response.json(
    { verified: true, status: data.status },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
