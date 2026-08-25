begin;

create table public.calendar_dates (
  id uuid primary key default gen_random_uuid(),
  date_value date not null unique,
  current_claim_id uuid,
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_dates_version_nonnegative check (version >= 0)
);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  date_id uuid not null references public.calendar_dates(id) on delete restrict,
  claimant_user_id uuid not null references public.app_users(id) on delete restrict,
  title text not null,
  story text not null,
  visibility text not null default 'public',
  status text not null default 'pending',
  canonical_amount_minor bigint not null,
  display_amount_minor bigint not null,
  display_currency text not null,
  fx_rate_snapshot numeric(20, 10) not null default 1,
  claimed_at timestamptz,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint claims_title_length check (char_length(title) between 3 and 100),
  constraint claims_story_length check (char_length(story) between 3 and 1000),
  constraint claims_visibility check (visibility in ('public', 'unlisted', 'private')),
  constraint claims_status check (status in ('pending', 'current', 'superseded', 'voided', 'refunded')),
  constraint claims_amount_positive check (canonical_amount_minor > 0 and display_amount_minor > 0),
  constraint claims_currency_shape check (display_currency ~ '^[A-Z]{3}$'),
  constraint claims_fx_rate_positive check (fx_rate_snapshot > 0),
  constraint claims_claimed_state check (
    (status = 'pending' and claimed_at is null)
    or (status <> 'pending' and claimed_at is not null)
  ),
  constraint claims_superseded_state check (
    (status = 'superseded' and superseded_at is not null)
    or (status <> 'superseded' and superseded_at is null)
  )
);

create unique index claims_one_current_per_date
  on public.claims (date_id)
  where status = 'current';
create index claims_public_leaderboard_idx
  on public.claims (canonical_amount_minor desc, claimed_at desc, id)
  where status = 'current' and visibility = 'public';
create index claims_date_history_idx
  on public.claims (date_id, claimed_at desc, id)
  where status in ('current', 'superseded');
create index claims_claimant_public_idx
  on public.claims (claimant_user_id, claimed_at desc, id)
  where visibility = 'public' and status in ('current', 'superseded');

alter table public.claims
  add column search_document tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(story, ''))
  ) stored;
create index claims_search_document_idx on public.claims using gin (search_document);

alter table public.calendar_dates
  add constraint calendar_dates_current_claim_fk
  foreign key (current_claim_id) references public.claims(id) on delete restrict
  deferrable initially deferred;

create table public.claim_events (
  id bigint generated always as identity primary key,
  date_id uuid not null references public.calendar_dates(id) on delete restrict,
  claim_id uuid not null references public.claims(id) on delete restrict,
  actor_user_id uuid references public.app_users(id) on delete set null,
  event_type text not null,
  amount_minor bigint not null,
  currency text not null default 'USD',
  visibility_snapshot text not null,
  created_at timestamptz not null default now(),
  constraint claim_events_type check (event_type in ('claimed', 'outbid', 'visibility_changed')),
  constraint claim_events_amount_positive check (amount_minor > 0),
  constraint claim_events_currency_shape check (currency ~ '^[A-Z]{3}$'),
  constraint claim_events_visibility check (visibility_snapshot in ('public', 'unlisted', 'private'))
);

create index claim_events_public_recent_idx
  on public.claim_events (created_at desc, id desc)
  where visibility_snapshot = 'public';

create trigger calendar_dates_set_updated_at
before update on public.calendar_dates
for each row execute function public.set_updated_at();

create trigger claims_set_updated_at
before update on public.claims
for each row execute function public.set_updated_at();

alter table public.calendar_dates enable row level security;
alter table public.calendar_dates force row level security;
alter table public.claims enable row level security;
alter table public.claims force row level security;
alter table public.claim_events enable row level security;
alter table public.claim_events force row level security;

create policy calendar_dates_select_public
on public.calendar_dates for select to anon, authenticated
using (true);

create policy claims_select_public
on public.claims for select to anon, authenticated
using (
  visibility = 'public'
  and status in ('current', 'superseded')
  and public.is_active_app_user(claimant_user_id)
);

create policy claims_select_own
on public.claims for select to authenticated
using (claimant_user_id = public.current_app_user_id());

create policy claim_events_select_public
on public.claim_events for select to anon, authenticated
using (
  visibility_snapshot = 'public'
  and exists (
    select 1 from public.claims visible_claim
    where visible_claim.id = claim_events.claim_id
      and visible_claim.visibility = 'public'
      and public.is_active_app_user(visible_claim.claimant_user_id)
  )
);

revoke all on public.calendar_dates from anon, authenticated;
revoke all on public.claims from anon, authenticated;
revoke all on public.claim_events from anon, authenticated;
grant select on public.calendar_dates to anon, authenticated;
grant select on public.claims to anon, authenticated;
grant select on public.claim_events to anon, authenticated;

create view public.public_claims
with (security_invoker = true)
as
select
  claim.id as claim_id,
  claim.date_id,
  day.date_value,
  claim.claimant_user_id,
  profile.username,
  profile.normalized_username,
  profile.display_name,
  claim.title,
  claim.story,
  claim.canonical_amount_minor,
  claim.display_amount_minor,
  claim.display_currency,
  claim.claimed_at,
  dense_rank() over (
    order by claim.canonical_amount_minor desc, claim.claimed_at asc, claim.id
  )::integer as leaderboard_rank,
  (
    claim.canonical_amount_minor::numeric
    * (1 + (0.15 / (1 + greatest(0, extract(epoch from (now() - claim.claimed_at)) / 86400))))
  ) as trend_score
from public.claims claim
join public.calendar_dates day on day.id = claim.date_id
join public.user_profiles profile on profile.user_id = claim.claimant_user_id
where claim.status = 'current'
  and claim.visibility = 'public'
  and profile.username is not null;

create view public.public_activity
with (security_invoker = true)
as
select
  event.id as event_id,
  event.event_type,
  event.created_at,
  day.date_value,
  event.amount_minor,
  event.currency,
  profile.username,
  event.title,
  event.claim_id
from (
  select claim_events.*, claims.id as claim_id, claims.claimant_user_id, claims.title
  from public.claim_events
  join public.claims on claims.id = claim_events.claim_id
  where claim_events.visibility_snapshot = 'public'
    and claim_events.event_type in ('claimed', 'outbid')
) event
join public.calendar_dates day on day.id = event.date_id
join public.user_profiles profile on profile.user_id = event.claimant_user_id
where profile.username is not null;

create view public.public_profiles
with (security_invoker = true)
as
select
  profile.user_id,
  profile.username,
  profile.normalized_username,
  profile.display_name,
  profile.bio,
  profile.avatar_url,
  count(claim.claim_id)::integer as public_claim_count,
  coalesce(max(claim.canonical_amount_minor), 0)::bigint as highest_claim_minor
from public.user_profiles profile
left join public.public_claims claim on claim.claimant_user_id = profile.user_id
where profile.username is not null
group by profile.user_id, profile.username, profile.normalized_username,
  profile.display_name, profile.bio, profile.avatar_url;

grant select on public.public_claims to anon, authenticated;
grant select on public.public_activity to anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

create or replace function public.search_public_claims(search_query text, result_limit integer default 20)
returns setof public.public_claims
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select public_claim.*
  from public.public_claims public_claim
  join public.claims claim on claim.id = public_claim.claim_id
  where char_length(btrim(search_query)) between 2 and 100
    and (
      claim.search_document @@ websearch_to_tsquery('simple', left(search_query, 100))
      or public_claim.normalized_username like '%' || public.normalize_username(left(search_query, 100)) || '%'
      or public_claim.date_value::text = btrim(search_query)
    )
  order by
    ts_rank(claim.search_document, websearch_to_tsquery('simple', left(search_query, 100))) desc,
    public_claim.canonical_amount_minor desc,
    public_claim.claim_id
  limit least(greatest(result_limit, 1), 50);
$$;

create or replace function public.get_public_date_claim(target_date date)
returns table (
  claim_id uuid,
  date_value date,
  username text,
  display_name text,
  title text,
  story text,
  canonical_amount_minor bigint,
  display_amount_minor bigint,
  display_currency text,
  visibility text,
  claimed_at timestamptz,
  is_private boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    claim.id,
    day.date_value,
    case when claim.visibility <> 'private' and public.is_active_app_user(claim.claimant_user_id)
      then profile.username else null end,
    case when claim.visibility <> 'private' and public.is_active_app_user(claim.claimant_user_id)
      then profile.display_name else null end,
    case when claim.visibility <> 'private' and public.is_active_app_user(claim.claimant_user_id)
      then claim.title else null end,
    case when claim.visibility <> 'private' and public.is_active_app_user(claim.claimant_user_id)
      then claim.story else null end,
    claim.canonical_amount_minor,
    claim.display_amount_minor,
    claim.display_currency,
    claim.visibility,
    claim.claimed_at,
    (claim.visibility = 'private' or not public.is_active_app_user(claim.claimant_user_id))
  from public.calendar_dates day
  join public.claims claim on claim.id = day.current_claim_id and claim.status = 'current'
  left join public.user_profiles profile on profile.user_id = claim.claimant_user_id
  where day.date_value = target_date;
$$;

create or replace function public.get_public_date_history(target_date date, result_limit integer default 25)
returns table (
  claim_id uuid,
  username text,
  amount_minor bigint,
  currency text,
  claimed_at timestamptz,
  status text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select claim.id, profile.username, claim.display_amount_minor,
    claim.display_currency, claim.claimed_at, claim.status
  from public.calendar_dates day
  join public.claims claim on claim.date_id = day.id
  join public.user_profiles profile on profile.user_id = claim.claimant_user_id
  where day.date_value = target_date
    and claim.visibility in ('public', 'unlisted')
    and claim.status in ('current', 'superseded')
    and public.is_active_app_user(claim.claimant_user_id)
  order by claim.claimed_at desc, claim.id
  limit least(greatest(result_limit, 1), 100);
$$;

revoke all on function public.search_public_claims(text, integer) from public;
revoke all on function public.get_public_date_claim(date) from public;
revoke all on function public.get_public_date_history(date, integer) from public;
grant execute on function public.search_public_claims(text, integer) to anon, authenticated;
grant execute on function public.get_public_date_claim(date) to anon, authenticated;
grant execute on function public.get_public_date_history(date, integer) to anon, authenticated;

commit;
