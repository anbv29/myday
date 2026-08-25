# Operations runbook

## Signals and alerts

Monitor request count, 4xx/5xx rate, p50/p95/p99, worker CPU/time, Supabase latency/connections/locks/slow queries, Redis failures, Clerk verification failures, checkout creation failures, verified-webhook failures, refund backlog, provider error rate, cache hit/fallthrough, and abnormal auth/username traffic. Alert on sustained 5xx, `/ready` failure, database saturation, webhook retry growth, refund-pending age, crash loops, privilege/secret changes, spend anomalies, and backup failure.

`GET /health` proves the worker can answer. `GET /ready` checks required configuration without naming missing secrets. It is not a deep dependency probe; pair it with provider-native monitors.

## Incident priorities

1. Protect payment and private-data integrity. Pause checkout or route to `/maintenance` when verification is uncertain.
2. Preserve provider payload/event references and database audit records; never replay by hand without idempotency analysis.
3. Keep public read-only surfaces available only if privacy and data freshness remain safe.
4. Communicate impact, begin/resolve times, affected providers, and reconciliation status without exposing internals.

## Provider/webhook outage

Disable new checkout for the affected route, retain already-created intent state, and let signed provider retries resume. Reconcile provider captures against `payment_records`, `payment_provider_events`, and `claim_checkout_intents`. Retry `refund_pending` only with the existing deterministic idempotency reference. Do not grant a claim manually based on a screenshot or redirect.

## Database and Redis

On Supabase outage, stop mutations and do not promote cached ownership. On Redis outage, production account/checkout rate-limited operations fail closed; public reads may fall through to bounded Supabase queries. After recovery, verify locks/connections, recent claim invariants, event uniqueness, and cache-version invalidation.

## Backup/restore

Enable automated Supabase backups/PITR with documented retention. Quarterly: restore to a new isolated project, apply no writes to production, compare row counts and critical constraints, verify one-current-claim invariants, sample payment/event reconciliation, rotate the temporary restore credentials, and destroy the isolated copy under the organization’s data-handling policy. Record RPO/RTO and drill evidence.

## Secret rotation

Create a replacement in the provider, update encrypted hosted secrets, deploy privately, verify health/webhooks, revoke the old key, and monitor failures. For webhook secrets, overlap endpoints only if the provider supports a safe rotation window. Treat any Git/log exposure as compromise. Rotate Clerk, Supabase service role, Upstash, payment, Sentry, and Pinecone independently.

## Rollback

Roll application code back to the last verified immutable version. Database migrations are forward-only: ship a corrective migration after backup and impact review. Never roll code back across an incompatible schema without a compatibility plan. Payment reconciliation continues through rollback.
