import { claimCheckoutSchema } from '@/lib/validation/claim';
import { getAppOrigin } from '@/lib/env';
import { hasTrustedMutationOrigin, readBoundedBody } from '@/server/http/security';
import { selectPaymentProvider } from '@/server/payments';
import { sha256Hex } from '@/server/payments/crypto';
import { getUsdInrReferenceRate } from '@/server/payments/fx';
import { checkCheckoutRateLimit } from '@/server/rate-limit/checkout';
import { createAdminSupabaseClient } from '@/server/supabase/admin';

const MAX_BODY_BYTES = 8 * 1024;

async function anonymousRateLimitKey(request: Request) {
  const forwarded = request.headers.get('x-vercel-forwarded-for')
    ?? request.headers.get('x-forwarded-for')
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';
  const ip = forwarded.split(',')[0]?.trim().slice(0, 64) || 'unknown';
  const userAgent = (request.headers.get('user-agent') ?? 'unknown').slice(0, 200);
  return `anonymous:${await sha256Hex(`${ip}|${userAgent}`)}`;
}

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return Response.json({ error: 'Request origin is not allowed.' }, { status: 403 });

  const rateLimit = await checkCheckoutRateLimit(await anonymousRateLimitKey(request));
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

  const supabase = createAdminSupabaseClient();
  if (parsed.data.billingCountry === 'IN') {
    try {
      const reference = await getUsdInrReferenceRate();
      const { error: rateError } = await supabase
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

  const { data, error } = await supabase.rpc('create_anonymous_claim_checkout_intent', {
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
    if (error.message.includes('fx_rate_unavailable')) return Response.json({ error: 'The current INR exchange rate could not be verified. Try again shortly.' }, { status: 503 });
    if (error.message.includes('invalid_claim_amount')) return Response.json({ error: 'The price changed. Refresh the claim quote and try again.' }, { status: 409 });
    if (error.code === '22023') return Response.json({ error: 'The claim request is no longer valid.' }, { status: 400 });
    console.error('Anonymous checkout intent creation failed', { error });
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
    appUrl: getAppOrigin(),
  };

  try {
    const checkout = shouldCreate
      ? await provider.createCheckout(checkoutInput)
      : await provider.resumeCheckout(checkoutReference as string, checkoutInput);
    if (shouldCreate) {
      const attached = await supabase.rpc('attach_anonymous_claim_checkout', {
        target_intent_id: intentId,
        request_access_key: parsed.data.idempotencyKey,
        provider_checkout_reference: checkout.checkoutReference,
      });
      if (attached.error) throw new Error('checkout_attach_failed');
    }
    const statusUrl = `/payment/status?intent=${encodeURIComponent(intentId)}&access=${encodeURIComponent(parsed.data.idempotencyKey)}`;
    return Response.json(
      { intentId, checkout, statusUrl },
      { status: 201, headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (providerError) {
    console.error('Payment checkout creation failed', { provider: provider.name, intentId, error: providerError });
    if (shouldCreate) {
      await supabase.rpc('fail_anonymous_claim_checkout', {
        target_intent_id: intentId,
        request_access_key: parsed.data.idempotencyKey,
        safe_failure_code: 'provider_checkout_failed',
      });
    }
    const credentialsRejected = providerError instanceof Error && providerError.message === 'payment_provider_401';
    const invalidAmount = providerError instanceof Error && providerError.message === 'invalid_payment_amount';
    return Response.json(
      {
        error: credentialsRejected
          ? 'Razorpay rejected the configured credentials.'
          : invalidAmount
            ? 'The payment amount must be at least 100 currency subunits.'
            : 'The payment provider could not start checkout. You have not been charged.',
      },
      { status: credentialsRejected ? 401 : invalidAmount ? 400 : 500 },
    );
  }
}
