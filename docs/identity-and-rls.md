# Anonymous checkout and RLS

MYDAY does not require an account or login. Public discovery uses the Supabase
publishable key through tightly scoped public views and read-only RPCs. Checkout
mutations run only on the Vercel server through the Supabase secret key.

## Required provider configuration

1. Create a Supabase project.
2. Apply every file under `supabase/migrations` in filename order using an
   elevated migration connection, never the application runtime key.
3. Store the project URL, publishable key, and secret key in Vercel.
4. Do not enable a MYDAY password system or Clerk Third-Party Auth connection.

## Anonymous buyer model

- Checkout requires a public `@handle` or complete HTTPS attribution URL.
- The server normalizes that attribution and PostgreSQL derives a SHA-256-based
  internal subject. The subject is never shown as proof of external identity.
- The deterministic internal app-user record preserves existing claim, payment,
  and audit foreign-key invariants without creating a user account.
- Public pages show the submitted attribution. It is self-asserted user content,
  and the Terms and Privacy pages state that MYDAY does not verify ownership of
  the named third-party account or organisation.
- Repeated use of the same normalized attribution maps to the same internal
  buyer record, while payment finalization remains tied to the exact checkout.

## Authorization model

- Public data is returned only through existing RLS-protected public views and
  bounded read-only RPCs.
- `create_anonymous_claim_checkout_intent`, `attach_anonymous_claim_checkout`,
  `fail_anonymous_claim_checkout`, and `get_anonymous_claim_intent` are granted
  only to `service_role`.
- The old authenticated checkout RPC grants are revoked by migration 5.
- The browser never submits an authoritative database user ID.
- Payment status requires both the unguessable intent UUID and the original
  16–100 character checkout access key. Responses are private and no-store.
- Only a valid Razorpay signed webhook can finalize ownership.

## Abuse and degraded behavior

Anonymous checkout is protected by same-origin validation, strict and bounded
input validation, and an Upstash rate limit keyed by a one-way hash of the
request network/user-agent fingerprint. Missing Redis, Supabase secret access,
current FX data for INR, or Razorpay credentials causes checkout to fail closed.
Public read-only pages remain available when safe.
