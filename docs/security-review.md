# Security review — 2026-08-25

## Reviewed and implemented

- Identity is verified server-side through Clerk; Supabase RLS maps the verified subject. Client user ids are not authoritative.
- Username normalization/uniqueness, reserved-name enforcement, strict input schemas, unknown-field rejection, trusted-origin checks, bounded bodies, and distributed mutation limits are implemented.
- Public database views suppress private content. Sensitive tables force RLS and use narrow policies/RPC grants.
- Checkout pricing/provider selection is recomputed server-side. Signed webhooks, raw-body limits, replay controls, unique events/payments, transaction locks, one-current-claim constraint, idempotent retries, and stale-payment refund handling protect ownership.
- Sensitive routes are no-store. Anonymous public caching is short and never authoritative. Security headers include HSTS in production, CSP, frame denial, MIME sniffing protection, referrer and permissions policies, and request ids.
- Placeholder detection now rejects both `replace_me` and `replace-me`; `/ready` fails closed when the core stack is incomplete.
- CI has least-privilege permissions, SHA-pinned actions, lockfile install, audit, typecheck, lint, tests, and build. A bounded read-only load script refuses production by default.
- No upload, custom password, admin panel, wallet, payout, WebSocket, AI agent, or arbitrary URL-fetch surface exists, reducing SSRF/file/realtime/AI attack area.

## Verification before public launch

External credentials and dashboards are not present in this repository, so the following cannot be truthfully completed in code alone:

1. Apply migrations and execute anon/user-A/user-B/service-role RLS tests in the target Supabase project.
2. Exercise Clerk session expiry, account deletion, webhook replay, redirect allowlists, enumeration resistance, and provider MFA.
3. Run Stripe/Razorpay test-mode success, invalid signature, replay, amount/currency mismatch, simultaneous same-date capture, refund retry, and reconciliation tests.
4. Configure Cloudflare WAF/rate controls and test deployed CSP/HSTS/cache headers, TLS, `/health`, `/ready`, and origin behavior.
5. Run secret history scanning in the canonical remote and rotate any previously exposed value. This workspace contains placeholders only by inspection.
6. Enable redacted Sentry/PostHog/Pinecone adapters only after privacy review and credentials; confirm their failure cannot break checkout.
7. Execute the staging load/race plan while observing database locks/connections and provider quotas.
8. Perform keyboard, screen-reader, contrast, mobile-device, reduced-motion, and print QA across supported browsers.
9. Complete and record a backup restore, incident contacts, alert delivery, rollback, and secret-rotation drill.

Public release remains gated on these operator-owned checks. Missing identity/data/Redis/payment configuration returns readiness 503 and sensitive flows fail closed.
