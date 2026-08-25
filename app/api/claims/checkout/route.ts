import { claimCheckoutSchema } from '@/lib/validation/claim';
import { getRequestIdentity } from '@/server/auth/identity';
import { hasTrustedMutationOrigin, readBoundedBody } from '@/server/http/security';
import { selectPaymentProvider } from '@/server/payments';
import { getUsdInrReferenceRate } from '@/server/payments/fx';
import { checkCheckoutRateLimit } from '@/server/rate-limit/checkout';
import { createAdminSupabaseClient } from '@/server/supabase/admin';
import { createUserSupabaseClient } from '@/server/supabase/user';

const MAX_BODY_BYTES = 8 * 1024;

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return Response.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  const identity = await getRequestIdentity(request);
  if (!identity) return Response.json({ error: 'Sign in before starting checkout.' }, { status: 401 });

  const rateLimit = await checkCheckoutRateLimit(identity.clerkUserId);
  if (!rateLimit.success) {
    return Response.json(
      { error: rateLimit.unavailable ? 'Checkout is temporarily unavailable.' : 'Too many checkout attempts. Try again later.' },
      { status: rateLimit.unavailable ? 503 : 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))) } },
    );
  }

  let rawBody: string;
  try {
    rawBody = await readBoundedBody(request, MAX_BODY_BYTES);
  } catch {
    return Response.json({ error: 'Request is too large.' }, { status: 413 });
  }

  let input: unknown;
  try { input = JSON.parse(rawBody); } catch { return Response.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const parsed = claimCheckoutSchema.safeParse(input);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid claim.' }, { status: 400 });

  const provider = selectPaymentProvider(parsed.data.billingCountry);
  if (!provider.isConfigured()) {
    return Response.json({ error: 'Razorpay checkout is not configured yet.' }, { status: 503 });
  }

  const token = await identity.getSupabaseToken();
  if (!token) return Response.json({ error: 'Authentication could not be verified.' }, { status: 401 });

  if (parsed.data.billingCountry === 'IN') {
    try {
      const reference = await getUsdInrReferenceRate();
      const admin = createAdminSupabaseClient();
      const { error: rateError } = await admin
        .from('payment_configuration')
        .update({
          usd_to_inr_rate: reference.rate,
          usd_to_inr_rate_date: reference.date,
          usd_to_inr_rate_observed_at: new Date().toISOString(),
          usd_to_inr_rate_source: reference.source,
        })
        .eq('singleton', true);
      if (rateError) throw rateError;
    } catch (rateError) {
      console.error('Unable to refresh the USD/INR checkout rate', rateError);
      return Response.json({ error: 'The current INR exchange rate could not be verified. Try again shortly.' }, { status: 503 });
    }
  }

  const supabase = createUserSupabaseClient(token);
  const { data, error } = await supabase.rpc('create_claim_checkout_intent', {
    target_date: parsed.data.date,
    claim_title: parsed.data.title,
    claim_story: parsed.data.story,
    claim_attribution: parsed.data.attribution,
    claim_visibility: parsed.data.visibility,
    proposed_amount_minor: parsed.data.amountMinor,
    billing_country_code: parsed.data.billingCountry,
    request_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error) {
    if (error.message.includes('onboarding_required')) return Response.json({ error: 'Choose your username before claiming a date.', action: '/onboarding/username' }, { status: 403 });
    if (error.message.includes('fx_rate_unavailable')) return Response.json({ error: 'The current INR exchange rate could not be verified. Try again shortly.' }, { status: 503 });
    if (error.message.includes('invalid_claim_amount')) return Response.json({ error: 'The price changed. Refresh the claim quote and try again.' }, { status: 409 });
    if (error.code === '22023') return Response.json({ error: 'The claim request is no longer valid.' }, { status: 400 });
    return Response.json({ error: 'Checkout could not be started.' }, { status: 503 });
  }

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  if (!row) return Response.json({ error: 'Checkout could not be started.' }, { status: 503 });
  const intentId = String(row.checkout_intent_id);
  const checkoutReference = typeof row.checkout_reference === 'string' ? row.checkout_reference : null;
  const shouldCreate = Boolean(row.should_create_checkout);
  const status = String(row.claim_status);
  const providerName = String(row.payment_provider);
  if (providerName !== provider.name) return Response.json({ error: 'Payment routing could not be verified.' }, { status: 503 });

  if (!shouldCreate && !checkoutReference) {
    return Response.json({ error: 'Checkout creation is already in progress.', intentId }, { status: 409 });
  }
  if (!shouldCreate && !['checkout_created'].includes(status)) {
    return Response.json({ error: 'This checkout cannot be restarted.', intentId, status }, { status: 409 });
  }

  const checkoutInput = {
    intentId,
    date: parsed.data.date,
    title: parsed.data.title,
    amountMinor: Number(row.amount_minor),
    currency: String(row.currency),
    appUrl: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').origin,
  };

  try {
    const checkout = shouldCreate
      ? await provider.createCheckout(checkoutInput)
      : await provider.resumeCheckout(checkoutReference as string, checkoutInput);
    if (shouldCreate) {
      const attached = await supabase.rpc('attach_claim_checkout', {
        target_intent_id: intentId,
        provider_checkout_reference: checkout.checkoutReference,
      });
      if (attached.error) throw new Error('checkout_attach_failed');
    }
    return Response.json(
      { intentId, checkout, statusUrl: `/payment/status?intent=${encodeURIComponent(intentId)}` },
      { status: 201, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' } },
    );
  } catch (providerError) {
    console.error('Payment checkout creation failed', { provider: provider.name, intentId, error: providerError });
    if (shouldCreate) await supabase.rpc('fail_claim_checkout', { target_intent_id: intentId, safe_failure_code: 'provider_checkout_failed' });
    return Response.json({ error: 'The payment provider could not start checkout. You have not been charged.' }, { status: 503 });
  }
}
