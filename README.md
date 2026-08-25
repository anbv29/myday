# MYDAY.LOL

MYDAY.LOL is a public record where people pay a platform fee to attach meaning to a calendar date. One verified claim is current per day; a higher valid claim can replace it while history remains. It is not an investment, resale market, wallet, security, or promise of financial return.

The product is a responsive, light-first editorial Next.js application with public leaderboards, exploration, search, profiles, date monuments, Clerk identity, account controls, and server-verified Stripe/Razorpay checkout.

## Product rules

- Any valid past, present, or future calendar date can be claimed.
- PostgreSQL—not the browser, a redirect, a cache, or a provider dashboard—is authoritative.
- One partial unique index permits only one `current` claim per date.
- The default opening claim is USD 20. The next claim is the current amount plus the greater of 10% or USD 10; configuration lives in PostgreSQL.
- A public attribution must be an `@handle` or complete HTTPS URL. Public, unlisted, and private visibility are enforced in database views and RLS.
- Payment grants a platform record only. There are no payouts, withdrawals, wallets, resale, or guaranteed returns.

## Architecture

```mermaid
flowchart TD
  U[Browser] --> C[Cloudflare edge / Sites]
  C --> N[Next.js + Vinext worker]
  N --> K[Clerk identity]
  N --> R[Upstash rate limits + cache version]
  N --> S[(Supabase PostgreSQL\nauthoritative state + RLS)]
  N --> P{Server payment policy}
  P -->|IN| Z[Razorpay]
  P -->|Other supported country| T[Stripe]
  Z --> W[Signed webhook]
  T --> W
  W --> N
  N -. optional, non-authoritative .-> O[PostHog / Sentry / Pinecone]
```

| Service | Responsibility | Failure behavior |
| --- | --- | --- |
| Cloudflare Sites | Worker hosting, CDN, TLS, edge controls | Health alerts; authoritative data remains in Supabase |
| Next.js/Vinext | UI, validation, authorization orchestration, webhook endpoints | Clean errors; no ownership guess |
| Clerk | Sessions and verified identity | Private actions deny; public record remains readable |
| Supabase PostgreSQL | Users, RLS, claims, history, payments, audit log, transactions | Claims and checkout fail closed |
| Upstash | Distributed abuse limits and public cache generation | Production writes fail closed; public reads fall through to Supabase |
| Stripe/Razorpay | Hosted payment collection and signed events | No ownership until a valid webhook transaction commits |
| PostHog/Sentry/Pinecone | Optional analytics, errors, derived semantic index | Core flow continues; lexical PostgreSQL search remains available |

The application is stateless. Scale worker instances behind Cloudflare; do not add microservices or multiple database regions until measurements justify them.

## Local setup

Requirements: Node.js 22.13+ and npm.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Preview records are allowed only when `MYDAY_ENABLE_PREVIEW_DATA=true` and never in production. With placeholder credentials, public preview pages work while auth, checkout, and account mutations show safe unavailable states.

Verification:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Environment variables

Public browser values: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Only the optional PostHog project key/host may also be public.

Server-only secrets: `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, Upstash credentials, payment keys/webhook secrets, `SENTRY_DSN`, and Pinecone credentials. `SUPABASE_DB_URL` is migration-only and must not be available to the runtime. Store secrets in encrypted platform storage, never Git. `/ready` returns 503 until the identity/data stack, Upstash, Stripe, and Razorpay are completely configured.

## Supabase and Clerk

1. Create a Supabase project and apply `supabase/migrations` in filename order with an elevated migration connection. Seed only development with `supabase/seed.sql`.
2. Enable Clerk Third-Party Auth in Supabase using the Clerk issuer domain. Do not create a duplicate password system or use the deprecated shared-JWT-secret approach.
3. Create Clerk webhook `POST /api/webhooks/clerk` for `user.created`, `user.updated`, and `user.deleted`.
4. Set Clerk redirect URLs for `/onboarding/username`, `/account`, and the production origin.

Clerk verifies the session; its token is forwarded to Supabase, whose RLS maps the verified `sub` to `app_users.clerk_user_id`. The browser never submits an authoritative user id. Tables force RLS, public views omit private fields, private mutations are RPCs with narrow grants, and the service-role key is confined to verified webhook/server paths. See `docs/identity-and-rls.md`.

## Upstash and Cloudflare

Create a REST-enabled Upstash Redis database and provide its URL/token. Rate-limit keys are scoped by operation and verified identity/origin context. Checkout and username mutations fail closed without Redis in production. Cache invalidation is best-effort after commit; cache never determines ownership.

For Cloudflare, use the Sites deployment flow configured by `.openai/hosting.json`. Add all environment values through hosted secret settings, bind the custom domain, enforce HTTPS, enable managed WAF/DDoS controls, and verify `/health`, `/ready`, CSP/HSTS, logs, and webhooks after deployment. Never place production secrets in build arguments or public variables.

## Payments

The client supplies a validated billing country, never a provider name. `IN` routes server-side to Razorpay/INR; other supported countries route to Stripe/USD. Configure:

- Stripe webhook: `POST /api/webhooks/stripe`, event `checkout.session.completed`.
- Razorpay webhook: `POST /api/webhooks/razorpay`, event `payment.captured`; enable automatic capture.

Handlers read the bounded raw body, verify signatures/replay windows, and call `finalize_verified_claim`. That transaction locks the intent and date, validates price/currency/provider/version, records a unique event/payment, supersedes the old claim, and commits one new current claim. A stale verified payment enters an idempotent refund path. Redirect pages only poll server state. See `docs/payments-and-claims.md`.

## Optional integrations

- PostHog: create a project, set the public key/host, implement consent-aware event capture, and exclude stories, attribution URLs, identity tokens, and payment details. It must never gate the claim path.
- Sentry: set a server DSN and configure source maps through encrypted CI secrets. Redact headers, cookies, request bodies, profile content, and payment identifiers before enabling transport.
- Pinecone: create a derived public-claim index keyed by claim id. Index only public title/story/date after the database commit through an idempotent bounded worker. Delete/update on visibility change. If unavailable, use existing bounded PostgreSQL lexical search.

These adapters are deliberately disabled without credentials and privacy configuration; the production readiness endpoint does not depend on them.

## Caching, scaling, and degraded behavior

Anonymous public GET responses use short shared caching (`s-maxage=60`, stale-while-revalidate 300). Requests with cookies/authorization and all account, API, checkout, onboarding, and payment paths are `private, no-store`. Supabase queries are bounded. Public cache generations change after authoritative claims.

Critical dependencies fail closed: unverified auth denies; invalid payment signatures do nothing; database/permission uncertainty reveals no private data; checkout provider failure records a safe failure. Optional analytics/search failures do not affect claims. `/maintenance` explains a deliberate pause; `/health` is liveness and `/ready` is configuration readiness without infrastructure details.

Graceful shutdown is delegated to the Cloudflare worker lifecycle: handlers hold no in-memory authoritative state, database clients are request-safe HTTP clients, and no local queue/connection requires SIGTERM cleanup. Background work must use a deployment-compatible durable mechanism with bounded retries, jitter, idempotency, and a dead-letter procedure before it is introduced.

## Operations, load, backup, and recovery

Run the safe local public check with `npm run load:public`; configure its bounded environment values as described in `load/README.md`. Same-date races, signup bursts, and webhook bursts must run only in an isolated staging project with provider test mode. Assert one current claim, unique provider events, bounded p95/p99, and no exhausted database connections.

Enable Supabase scheduled backups/PITR appropriate to business requirements and test restoration quarterly into an isolated project. Export payment/audit reconciliation data according to retention policy. Recovery, outage, alerting, secret rotation, and restore steps are in `docs/operations.md`.

## CI/CD and production deployment

`.github/workflows/ci.yml` uses read-only permissions, pinned action SHAs, locked npm dependencies, a production dependency audit, typecheck, lint, tests, and build. Protect the production environment, require reviews, use short-lived deployment credentials, and never expose provider secrets to pull-request builds.

Deployment order:

1. Verify and back up the target Supabase project; apply migrations.
2. Configure Clerk, Upstash, test-mode provider webhooks, and hosted secrets.
3. Run the full verification suite and staging race/replay tests.
4. Deploy privately, verify health/readiness/security headers and smoke tests, then explicitly approve public access.
5. Switch payment providers to live keys only after webhook reconciliation and rollback exercises succeed.

## Security checklist

- [ ] No real secret is tracked or present in client bundles/build logs; rotate anything ever committed.
- [ ] RLS policies and grants are applied and tested with anon, two user identities, and service role.
- [ ] Clerk/webhook origins, redirects, signatures, replay windows, and event idempotency are verified.
- [ ] Same-date concurrency leaves exactly one current claim; stale captures are reconciled/refunded.
- [ ] CORS/origin rules, request sizes, validation, rate limits, CSP, HSTS, frame denial, and no-store paths are verified on the deployed host.
- [ ] Provider dashboards use MFA, least privilege, alerts, live/test isolation, and secret rotation ownership.
- [ ] Dependency audit, pinned CI actions, branch protection, backup restore drill, incident contacts, and monitoring alerts are current.
- [ ] Public/private/unlisted behavior is tested for leaderboard, search, profiles, dates, activity, sitemap, and cache keys.
- [ ] Accessibility keyboard, focus, contrast, reduced motion, mobile layouts, print output, empty/error/loading states are checked before release.

The code review record and remaining dashboard-side controls are documented in `docs/security-review.md`.
