# Claims and payments

Section 4 implements a server-authoritative claim state machine. Browser redirects and payment callbacks never change date ownership.

## Routing policy

- A validated billing country of `IN` routes to Razorpay and charges INR.
- Other supported billing countries route to Stripe Checkout and charge USD.
- The client submits billing context, not a provider name. The server and database independently derive the provider.
- The canonical leaderboard amount is stored in USD minor units. Razorpay display amounts use the database FX snapshot stored on the checkout intent.

The singleton `payment_configuration` row controls the base amount, percentage increment, minimum increment, maximum amount, INR conversion snapshot, and quote lifetime. Operational changes should be audited and performed with migration/admin credentials.

Every checkout also requires a public attribution: either an `@handle` or a complete HTTPS URL. It is stored in the signed-payment claim intent, copied into the claim only during authoritative finalization, and displayed on public leaderboard/date surfaces. Outbound URLs are normalized server-side and rendered with `noopener`, `noreferrer`, `nofollow`, and `ugc`; private claims suppress the attribution with the rest of the claimant identity.

## State machine

```text
creating_checkout
  -> checkout_created
  -> payment_verified
  -> completed

Any stale, expired, amount-mismatched, or currency-mismatched verified payment:
payment_verified -> refund_pending -> refunded

Provider creation failure:
creating_checkout -> failed
```

The initial base claim is USD 20. An occupied date requires the current canonical amount plus the greater of 10% or USD 10. The server re-reads this configuration and the locked date state; displayed browser prices are informational.

## Concurrency boundary

Checkout creation never holds a database lock while calling Stripe or Razorpay. After a signed webhook is verified, `finalize_verified_claim` runs one short transaction:

1. Serializes duplicate provider events with an advisory transaction lock.
2. Locks the checkout intent and the single calendar-date row.
3. Verifies provider, payment identifier, amount, currency, expiry, expected current claim, date version, and latest minimum amount.
4. Supersedes the old current claim, creates the new claim, advances the date version, records activity and audit history, and commits atomically.
5. If the expected date state changed, ownership remains untouched and the captured payment is routed to an idempotent provider refund.

The partial unique index from migration 2 remains the final invariant preventing two current claims for one date.

## Idempotency

- Checkout requests require a 16–100 character idempotency key unique per user.
- An idempotency key cannot be reused with different claim content.
- Stripe session creation and refunds use deterministic provider idempotency keys.
- Razorpay orders are protected by the leased database checkout-creation state; refunds use the claim-intent UUID as Razorpay's idempotent `receipt` value.
- Provider event IDs are unique per provider and raw webhook bodies are represented only by a SHA-256 digest.

## Webhooks

Configure these exact endpoints:

- Stripe: `POST /api/webhooks/stripe`, event `checkout.session.completed`
- Razorpay: `POST /api/webhooks/razorpay`, event `payment.captured`

Both handlers read the raw body with a 1 MB limit and verify HMAC signatures before JSON processing. Stripe timestamps must be within five minutes. Razorpay requires `X-Razorpay-Event-Id` for replay protection.

Stripe API requests are pinned to `2026-02-25.clover`; configure the Stripe webhook endpoint with the same event API version so payloads remain stable across account-default upgrades.

## Provider setup

Set the server-only placeholders documented in `.env.example`. Never prefix secrets with `NEXT_PUBLIC_`.

For local Stripe testing, forward signed events to `/api/webhooks/stripe` and use a test-mode Checkout Session. For Razorpay, use test-mode keys and a test webhook secret. A real claim can only be exercised after Clerk, Supabase migrations 1–3, Upstash, and the chosen payment provider are connected.

Razorpay must have automatic capture enabled so the configured `payment.captured` webhook is authoritative. Webhook-time refund calls use a three-second provider timeout to remain within Razorpay's delivery window; a timeout leaves the intent `refund_pending` and deliberately returns a retryable HTTP 503.

## Failure behavior

- Missing provider configuration disables checkout visibly and returns HTTP 503.
- Missing Redis in production fails closed for checkout initiation.
- Provider creation failure marks the intent failed and tells the user they were not charged.
- Database finalization failure returns HTTP 503 so the provider retries.
- A failed automatic refund remains `refund_pending`; webhook retries reuse the same refund idempotency key.
- Public cache version invalidation is best-effort after the authoritative transaction. PostgreSQL remains the source of truth.
