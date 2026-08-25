# Public discovery data

Section 3 exposes only confirmed public records through the anonymous Supabase role.

## Public surfaces

- `/` — top current claims
- `/leaderboard` — value, time, and calendar-scope views
- `/explore` — recently claimed dates
- `/trending` — value-and-recency ranking
- `/activity` — confirmed public claim events
- `/search` — full-text date, story, title, and username search
- `/day/YYYY-MM-DD` — exact current claim plus public/unlisted history
- `/@username` — public profile and current public claims

## Data states

`server/public-data/index.ts` is the only read repository used by these routes. It returns one of:

1. `supabase` — live anonymous data protected by RLS.
2. `preview` — explicitly labeled sample records, available only outside production unless disabled with `MYDAY_ENABLE_PREVIEW_DATA=false`.
3. `unavailable` — a safe empty/degraded state. Provider errors are logged server-side and are never rendered to visitors.

There is no production fallback to fake records.

## Apply the schema

Run migrations in filename order:

1. `202608250001_core_identity.sql`
2. `202608250002_public_claims.sql`

The second migration creates calendar dates, claims, immutable public claim events, anonymous RLS policies, security-invoker public views, and bounded search/date RPCs. Live validation requires the environment variables in `.env.example` and a Supabase project with the migrations applied.

## Privacy boundary

- Leaderboards, search, profiles, trending, and activity include public current claims only.
- Exact-date lookup allows unlisted claims but keeps them out of discovery.
- Private claims expose only the claimed state and amount; claimant, title, and story are replaced with a private stub.
- Suspended/deleted app users are excluded through `is_active_app_user`.
- Owner access is a separate authenticated policy, preventing anonymous roles from evaluating authenticated identity functions.
