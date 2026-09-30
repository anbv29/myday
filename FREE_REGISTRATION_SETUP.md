# Free date registration: production setup

This addition keeps the existing Next.js, Supabase, Redis and Razorpay architecture.
Paid checkout, verification, webhook processing and paid claim tables are unchanged.

## What visitors see

- The homepage is a collection of submitted dates, not an ordinary month calendar.
- Default order is chronological by exact date, including year.
- Visitors can switch to highest-paid order or filter paid/free entries and year.
- Paid featured cards show the recorded payment amount and public claimant.
- Free cards say “Free registration”; they never claim a payment or paid rank.
- The existing leaderboard remains paid-only and ranked by canonical payment value.

## Priority rules

- The first free registration for a date is shown while there is no paid holder.
- Retrying the same free submission is idempotent; it cannot overwrite another story.
- A paid claim overrides a free registration for the same exact date and year.
- A free submission cannot replace an existing paid claim.
- Subsequent paid claims follow the existing higher-price and verified-payment rules.
- Private and unlisted paid claims also suppress a free entry, without exposing their data.
- Free registration creates no exclusive ownership or financial right.

## One required Supabase step

1. Open your existing Supabase project.
2. Open SQL Editor and create a new query.
3. Copy the complete contents of `supabase/migrations/202610010007_free_date_registrations.sql`.
4. Run it once, after the existing migrations, and confirm success.
5. The migration adds only a free-registration table, a service-role-only read view,
   and a service-role-only registration function. It does not change paid schemas.

If you use the Supabase CLI migration workflow, apply this migration through that
workflow instead of running it manually. Do not apply it twice through both routes.

## Vercel deployment

1. Keep your current Supabase, Redis and Razorpay environment variables unchanged.
2. Ensure `SUPABASE_SERVICE_ROLE_KEY` remains a server-only secret.
3. Push the committed code to your GitHub deployment branch and redeploy Vercel.
4. Register an unclaimed test date through `/register`.
5. Reload the homepage in another browser: the entry should appear as Free.
6. Complete a Razorpay test-mode paid claim for that date: only the paid entry should remain.
7. A further free attempt must be rejected; higher paid claims retain their existing behavior.

No new environment variable or third-party service is required. Before the migration,
paid discovery remains available and free registration fails safely rather than pretending
to save. This workspace's automated tests use mocked database responses; they do not
prove that the migration or a payment has completed in your remote Supabase project.
