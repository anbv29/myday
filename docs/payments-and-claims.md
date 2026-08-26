# Claims and payments

Section 4 implements a server-authoritative claim state machine. Browser redirects and payment callbacks never change date ownership.

## Routing policy

- Every payment routes to Razorpay.
- A validated billing country of `IN` charges INR using the latest verified daily ECB USD/INR reference fetched server-side through Frankfurter.
- Other supported billing countries create a Razorpay order in USD for enabled international cards.
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

The initial base claim is USD 1. An occupied date requires the current canonical amount plus the greater of 10% or USD 1. The server re-reads this configuration and the locked date state; displayed browser prices are informational. INR rate responses must identify USD/INR, stay within a conservative sanity range, and be no more than seven days old. The server writes the fetched rate and observation time through its service role; the checkout transaction refuses INR conversion if that observation is more than one hour old.

## Concurrency boundary

Checkout creation never holds a database lock while calling the FX reference service or Razorpay. After a signed webhook is verified, `finalize_verified_claim` runs one short transaction:

1. Serializes duplicate provider events with an advisory transaction lock.
2. Locks the checkout intent and the single calendar-date row.
3. Verifies provider, payment identifier, amount, currency, expiry, expected current claim, date version, and latest minimum amount.
4. Supersedes the old current claim, creates the new claim, advances the date version, records activity and audit history, and commits atomically.
5. If the expected date state changed, ownership remains untouched and the captured payment is routed to an idempotent provider refund.

The partial unique index from migration 2 remains the final invariant preventing two current claims for one date.

## Idempotency

- Checkout requests require a 16–100 character idempotency/access key unique per anonymous attribution record.
- An idempotency key cannot be reused with different claim content.
- Razorpay orders are protected by the leased database checkout-creation state; refunds use the claim-intent UUID as Razorpay's idempotent `receipt` value.
- Provider event IDs are unique per provider and raw webhook bodies are represented only by a SHA-256 digest.

## Webhooks

Configure `POST /api/webhooks/razorpay` for the `payment.captured` event. The handler reads the raw body with a 1 MB limit and verifies the HMAC before JSON processing. Razorpay's `X-Razorpay-Event-Id` is mandatory for replay protection.

## Provider setup

Set the server-only placeholders documented in `.env.example`. Never prefix secrets with `NEXT_PUBLIC_`.

Use Razorpay test-mode keys and a test webhook secret locally. A real claim can only be exercised after all Supabase migrations, Upstash, and Razorpay are connected. Complete Razorpay KYC and request international-card activation before foreign payments; keep the Terms, Privacy, Refund/Cancellation, and Delivery policy pages publicly reachable for the review.

Razorpay must have automatic capture enabled so the configured `payment.captured` webhook is authoritative. Webhook-time refund calls use a three-second provider timeout to remain within Razorpay's delivery window; a timeout leaves the intent `refund_pending` and deliberately returns a retryable HTTP 503.

## Failure behavior

- Missing provider configuration disables checkout visibly and returns HTTP 503.
- Missing Redis in production fails closed for checkout initiation.
- Provider creation failure marks the intent failed and tells the user they were not charged.
- Database finalization failure returns HTTP 503 so the provider retries.
- A failed automatic refund remains `refund_pending`; webhook retries reuse the same refund idempotency key.
- Public cache version invalidation is best-effort after the authoritative transaction. PostgreSQL remains the source of truth.
