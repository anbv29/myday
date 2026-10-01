# Dodo Payments setup for MYDAY

## 1. Confirm product approval

Explain the actual product to Dodo: buyers pay MYDAY for a featured calendar-date
record; a higher valid payment can replace the current record, with history retained.
There are no payouts, resale, gambling prizes, investment returns, or date bookings.
Ask compliance@dodopayments.com to confirm eligibility before accepting real money.
Account verification alone is not confirmation that this business model is approved.

## 2. Create matching test-mode products

Create two one-time products: `MYDAY featured claim — USD` and `— INR`.
For each: enable Pay What You Want, enable tax-inclusive pricing, disable product
discounts and Purchasing Power Parity. Set the minimum to 100 minor units (USD 1
and INR 1 respectively), or lower if the dashboard permits. The app supplies the
actual authoritative price. Do not set a minimum above the smallest app claim.
Disable adaptive-currency/charm-pricing features that could change the exact total.
The app validates product pricing before opening checkout; it never changes products.

## 3. Configure environment variables

In Vercel → Project → Settings → Environment Variables add:

| Key | Value/source | Type |
| --- | --- | --- |
| `DODO_PAYMENTS_ENVIRONMENT` | `test_mode` initially; `live_mode` after approval/testing | Config |
| `DODO_PAYMENTS_API_KEY` | Dodo dashboard API key for that environment | Secret |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Signing secret from the Dodo webhook endpoint | Secret |
| `DODO_PAYMENTS_PRODUCT_ID_USD` | USD product ID from step 2 | Config |
| `DODO_PAYMENTS_PRODUCT_ID_INR` | INR product ID from step 2 | Config |
| `NEXT_PUBLIC_APP_URL` | Your full HTTPS site origin, without a page path | Config |

Keep existing Supabase and Upstash variables. No Dodo variable needs NEXT_PUBLIC_.
Use the same names in ignored `.env.local` for local development. Never commit keys.
Preview/staging should use test keys/products/webhooks; production live mode requires
its own live API key, live product IDs, and live webhook signing key together.

## 4. Apply the compatibility migration

After all previous migrations, run `supabase/migrations/202610010008_dodo_payments.sql`
in the Supabase SQL editor using your migration/admin access. It switches new intents
to Dodo while keeping old Razorpay payment rows and the existing claim transaction.
No claims, free registrations, pricing settings, history, tables, or RLS policies are deleted.
If it reports an unexpected function definition, stop and inspect; do not bypass guards.
Migration files run once, in order. Do not rerun old migrations over a live database.

## 5. Add the webhook and redeploy

In the matching Dodo dashboard environment, create an HTTPS webhook endpoint:
`https://YOUR-DOMAIN/api/webhooks/dodo`. Subscribe to `payment.succeeded`,
`payment.failed`, `payment.cancelled`, and `refund.succeeded`. Save its signing key
in Vercel, then redeploy with the latest environment settings. The endpoint must be
publicly reachable; Vercel deployment protection must not block Dodo's deliveries.
Keep `/api/webhooks/razorpay` and old secrets until pending old payments/refunds finish.
Only then remove the old keys. New purchases never route to Razorpay.

## 6. Test before live mode

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
The current dependency audit flags pre-existing Next.js/sharp advisories, which
were deliberately not upgraded as part of this payment-only migration. The CI
audit step may remain red until those separate security patches are approved.
Visit `/ready` after configuring real Supabase/Redis/Dodo values. Choose a date,
enter a title/story/handle and amount, accept the consent, and continue to Dodo.
Use Dodo's documented test payment methods; test INR and USD with supported methods.
Successful checkout returns to MYDAY's status page with its existing access key.
The page must not show success until the signed webhook commits the claim.
Check the date record, leaderboard, and webhook delivery logs after completion.
Also test failure/cancellation, repeated webhook delivery, and concurrent same-date
payments: only one claim wins; the stale paid claim enters a confirmed full-refund flow.
Refund requests may be pending/review; do not call them refunded before confirmation.
Refund failures, partial/dashboard refunds, and delivery of unrelated events require
operator reconciliation. Monitor refund_pending intents and Dodo delivery failures.
Local webhook testing requires a public HTTPS tunnel or staging deployment; localhost
alone cannot receive Dodo's server-to-server webhook. Never use real cards in test mode.

References: https://docs.dodopayments.com/features/checkout,
https://docs.dodopayments.com/developer-resources/webhooks,
https://docs.dodopayments.com/miscellaneous/merchant-acceptance.
