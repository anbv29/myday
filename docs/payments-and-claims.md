# Claims and payments

MYDAY keeps the existing server-authoritative Supabase claim state machine.
Browser redirects and checkout callbacks never grant ownership.

## Routing and prices

- New purchases use Dodo Payments hosted Checkout Sessions.
- Indian billing uses the latest verified daily ECB USD/INR reference via Frankfurter.
- Other supported billing countries pay USD; canonical leaderboard values remain USD.
- Server/database calculate the provider and exact price, not the browser.
- Separate USD/INR one-time PWYW products must be tax-inclusive with no discounts/PPP.
- Sessions use quantity 1 and disable discounts and currency selection.
- Product settings are checked before creation; mismatched gross payment totals refund.
- Metadata contains only the intent ID and date, never private stories or access keys.
- A checked same-origin return URL carries the existing anonymous status access key.

## State and concurrency

creating_checkout -> checkout_created -> payment_verified -> completed

Stale, expired, or mismatched verified payments enter refund_pending -> refunded.
Failed session creation marks the intent failed. Signed failed/cancelled payment
events only mark checkout_created intents failed; completed claims cannot be overwritten.
The opening amount is USD 1; the next minimum adds the greater of 10% or USD 1.
Existing configuration, FX snapshots, visibility, anonymous attribution, RLS,
date version checks, advisory locks, and the one-current-claim index remain unchanged.
Provider API calls run outside the short database finalization transaction.
Anonymous request/access keys are unchanged and cannot be reused for different content.
Sessions resume without creating a second checkout; expired/paid sessions are rejected.

## Webhooks

POST /api/webhooks/dodo reads a bounded raw body. The official SDK validates
webhook-id, webhook-timestamp, webhook-signature and its replay window before use.
payment.succeeded must have a succeeded status, session ID, payment ID, currency,
and integer total_amount. Verification uses the gross customer payment, never
settlement_amount (which may exclude fees/tax or use a different currency).
The existing finalize_verified_claim RPC validates exact provider/amount/currency,
intent expiry and date version, then atomically updates the claim/history/audit log.
Unique provider-event IDs and payment IDs protect duplicate delivery.
DB failures return 503 for retry. Invalid signatures return 400 with no DB writes.

## Refunds and legacy records

Stale payments request a full refund only after verifying the actual paid amount.
A Redis cooldown blocks concurrent refund requests; provider refunds are checked
before issuing another request. Pending/review refunds stay refund_pending.
A succeeded refund response or signed refund.succeeded event can mark them refunded;
the event must match the stored full payment amount/currency and pending state.
Partial/dashboard refunds of delivered claims need manual reconciliation, never
automatic ownership changes. Monitor pending refunds and provider delivery failures.
Existing Razorpay rows and callbacks remain valid for in-flight old payments.
The legacy browser verification endpoint is restricted to Razorpay intents and
cannot mark a claim paid. New frontend checkout never calls it or loads Razorpay.

## Deployment

See [Dodo setup](dodo-setup.md). Apply migration 008 after all previous migrations.
It patches provider literals only and keeps prior claim fixes, transactions and grants.
Configure matching test/live API keys, webhook key and both product IDs; no Dodo
secrets are public. Keep legacy keys only until earlier payments/refunds finish.
Approval and staging payment/refund/race tests are required before live use.
