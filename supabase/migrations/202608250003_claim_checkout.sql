begin;

create table public.payment_configuration (
  singleton boolean primary key default true check (singleton),
  base_claim_amount_minor bigint not null default 100,
  increment_basis_points integer not null default 1000,
  minimum_increment_minor bigint not null default 100,
  maximum_claim_amount_minor bigint not null default 100000000,
  usd_to_inr_rate numeric(20, 10) not null default 95.7540294925,
  usd_to_inr_rate_date date,
  usd_to_inr_rate_observed_at timestamptz,
  usd_to_inr_rate_source text,
  quote_ttl_seconds integer not null default 900,
  updated_at timestamptz not null default now(),
  constraint payment_configuration_amounts_positive check (
    base_claim_amount_minor > 0
    and minimum_increment_minor > 0
    and maximum_claim_amount_minor >= base_claim_amount_minor
  ),
  constraint payment_configuration_increment_range check (increment_basis_points between 1 and 10000),
  constraint payment_configuration_rate_sane check (usd_to_inr_rate between 40 and 200),
  constraint payment_configuration_ttl_range check (quote_ttl_seconds between 60 and 3600)
);

insert into public.payment_configuration (singleton) values (true);

create table public.claim_checkout_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete restrict,
  date_id uuid not null references public.calendar_dates(id) on delete restrict,
  expected_current_claim_id uuid references public.claims(id) on delete restrict,
  expected_date_version bigint not null,
  title text not null,
  story text not null,
  attribution text not null,
  visibility text not null,
  canonical_amount_minor bigint not null,
  display_amount_minor bigint not null,
  display_currency text not null,
  fx_rate_snapshot numeric(20, 10) not null,
  billing_country text not null,
  provider text not null,
  provider_checkout_id text,
  provider_payment_id text,
  idempotency_key text not null,
  status text not null default 'creating_checkout',
  failure_code text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint claim_checkout_title_length check (char_length(title) between 3 and 100),
  constraint claim_checkout_story_length check (char_length(story) between 3 and 1000),
  constraint claim_checkout_attribution check (
    char_length(attribution) between 3 and 200
    and (attribution ~ '^@[A-Za-z0-9._]{2,40}$' or attribution ~ '^https://')
  ),
  constraint claim_checkout_visibility check (visibility in ('public', 'unlisted', 'private')),
  constraint claim_checkout_amounts_positive check (canonical_amount_minor > 0 and display_amount_minor > 0),
  constraint claim_checkout_currency_shape check (display_currency ~ '^[A-Z]{3}$'),
  constraint claim_checkout_country_shape check (billing_country ~ '^[A-Z]{2}$'),
  constraint claim_checkout_provider check (provider = 'razorpay'),
  constraint claim_checkout_status check (status in (
    'creating_checkout', 'checkout_created', 'payment_verified', 'completed',
    'conflict', 'refund_pending', 'refunded', 'failed', 'expired'
  )),
  constraint claim_checkout_idempotency_shape check (idempotency_key ~ '^[A-Za-z0-9_-]{16,100}$'),
  unique (user_id, idempotency_key),
  unique (provider, provider_checkout_id)
);

create index claim_checkout_user_recent_idx
  on public.claim_checkout_intents (user_id, created_at desc, id desc);
create index claim_checkout_expiry_idx
  on public.claim_checkout_intents (expires_at)
  where status in ('creating_checkout', 'checkout_created');

create table public.payment_records (
  id uuid primary key default gen_random_uuid(),
  checkout_intent_id uuid not null unique references public.claim_checkout_intents(id) on delete restrict,
  provider text not null,
  provider_payment_id text not null,
  amount_minor bigint not null,
  currency text not null,
  status text not null,
  verified_at timestamptz not null default now(),
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_records_provider check (provider = 'razorpay'),
  constraint payment_records_amount_positive check (amount_minor > 0),
  constraint payment_records_currency_shape check (currency ~ '^[A-Z]{3}$'),
  constraint payment_records_status check (status in ('captured', 'refund_pending', 'refunded', 'failed')),
  unique (provider, provider_payment_id)
);

create table public.payment_provider_events (
  id bigint generated always as identity primary key,
  provider text not null,
  provider_event_id text not null,
  checkout_intent_id uuid references public.claim_checkout_intents(id) on delete restrict,
  payload_digest text not null,
  status text not null default 'processing',
  outcome text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint payment_provider_events_provider check (provider = 'razorpay'),
  constraint payment_provider_events_digest_shape check (payload_digest ~ '^[a-f0-9]{64}$'),
  constraint payment_provider_events_status check (status in ('processing', 'processed', 'failed')),
  unique (provider, provider_event_id)
);

create trigger payment_configuration_set_updated_at
before update on public.payment_configuration
for each row execute function public.set_updated_at();

create trigger claim_checkout_intents_set_updated_at
before update on public.claim_checkout_intents
for each row execute function public.set_updated_at();

create trigger payment_records_set_updated_at
before update on public.payment_records
for each row execute function public.set_updated_at();

alter table public.payment_configuration enable row level security;
alter table public.payment_configuration force row level security;
alter table public.claim_checkout_intents enable row level security;
alter table public.claim_checkout_intents force row level security;
alter table public.payment_records enable row level security;
alter table public.payment_records force row level security;
alter table public.payment_provider_events enable row level security;
alter table public.payment_provider_events force row level security;

create policy claim_checkout_intents_select_own
on public.claim_checkout_intents for select to authenticated
using (user_id = public.current_app_user_id());

create policy payment_records_select_own
on public.payment_records for select to authenticated
using (
  exists (
    select 1 from public.claim_checkout_intents intent
    where intent.id = payment_records.checkout_intent_id
      and intent.user_id = public.current_app_user_id()
  )
);

revoke all on public.payment_configuration from anon, authenticated;
revoke all on public.claim_checkout_intents from anon, authenticated;
revoke all on public.payment_records from anon, authenticated;
revoke all on public.payment_provider_events from anon, authenticated;
grant select on public.claim_checkout_intents to authenticated;
grant select on public.payment_records to authenticated;

create or replace function public.minimum_claim_amount(current_amount_minor bigint)
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when current_amount_minor is null then config.base_claim_amount_minor
    else current_amount_minor + greatest(
      config.minimum_increment_minor,
      ceil(current_amount_minor * config.increment_basis_points / 10000.0)::bigint
    )
  end
  from public.payment_configuration config
  where config.singleton;
$$;

create or replace function public.get_claim_quote(target_date date)
returns table (
  date_value date,
  current_claim_id uuid,
  current_amount_minor bigint,
  minimum_amount_minor bigint,
  current_username text,
  date_version bigint,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    target_date,
    day.current_claim_id,
    current_claim.canonical_amount_minor,
    public.minimum_claim_amount(current_claim.canonical_amount_minor),
    case when current_claim.visibility = 'public' and public.is_active_app_user(current_claim.claimant_user_id)
      then profile.username else null end,
    coalesce(day.version, 0),
    now() + make_interval(secs => config.quote_ttl_seconds)
  from public.payment_configuration config
  left join public.calendar_dates day on day.date_value = target_date
  left join public.claims current_claim on current_claim.id = day.current_claim_id and current_claim.status = 'current'
  left join public.user_profiles profile on profile.user_id = current_claim.claimant_user_id
  where config.singleton
    and target_date between date '1900-01-01' and date '2100-12-31';
$$;

create or replace function public.create_claim_checkout_intent(
  target_date date,
  claim_title text,
  claim_story text,
  claim_attribution text,
  claim_visibility text,
  proposed_amount_minor bigint,
  billing_country_code text,
  request_idempotency_key text
)
returns table (
  checkout_intent_id uuid,
  payment_provider text,
  amount_minor bigint,
  currency text,
  claim_status text,
  should_create_checkout boolean,
  checkout_reference text,
  valid_until timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  app_user_id uuid := public.current_app_user_id();
  day_record public.calendar_dates%rowtype;
  current_claim public.claims%rowtype;
  config public.payment_configuration%rowtype;
  existing public.claim_checkout_intents%rowtype;
  normalized_country text := upper(btrim(billing_country_code));
  selected_provider text;
  selected_currency text;
  selected_fx numeric(20, 10);
  selected_display_amount bigint;
  minimum_amount bigint;
  new_intent public.claim_checkout_intents%rowtype;
begin
  if app_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not exists (
    select 1 from public.user_profiles profile
    where profile.user_id = app_user_id and profile.onboarding_completed and profile.username is not null
  ) then
    raise exception using errcode = '42501', message = 'onboarding_required';
  end if;

  if target_date is null or claim_title is null or claim_story is null or claim_attribution is null
    or claim_visibility is null or proposed_amount_minor is null
    or billing_country_code is null or request_idempotency_key is null
    or target_date not between date '1900-01-01' and date '2100-12-31'
    or char_length(btrim(claim_title)) not between 3 and 100
    or char_length(btrim(claim_story)) not between 3 and 1000
    or char_length(btrim(claim_attribution)) not between 3 and 200
    or not (
      btrim(claim_attribution) ~ '^@[A-Za-z0-9._]{2,40}$'
      or btrim(claim_attribution) ~ '^https://'
    )
    or claim_visibility not in ('public', 'unlisted', 'private')
    or normalized_country !~ '^[A-Z]{2}$'
    or request_idempotency_key !~ '^[A-Za-z0-9_-]{16,100}$'
  then
    raise exception using errcode = '22023', message = 'invalid_claim_request';
  end if;

  select * into config from public.payment_configuration where singleton;
  selected_provider := 'razorpay';
  selected_currency := case when normalized_country = 'IN' then 'INR' else 'USD' end;
  selected_fx := case when normalized_country = 'IN' then config.usd_to_inr_rate else 1 end;

  if normalized_country = 'IN' and (
    config.usd_to_inr_rate_date is null
    or config.usd_to_inr_rate_date < current_date - 7
    or config.usd_to_inr_rate_observed_at is null
    or config.usd_to_inr_rate_observed_at < now() - interval '1 hour'
    or config.usd_to_inr_rate_source <> 'ECB via Frankfurter'
  ) then
    raise exception using errcode = '55000', message = 'fx_rate_unavailable';
  end if;

  select * into existing
  from public.claim_checkout_intents intent
  where intent.user_id = app_user_id and intent.idempotency_key = request_idempotency_key
  for update;

  if found then
    if (select day.date_value from public.calendar_dates day where day.id = existing.date_id) <> target_date
      or existing.title <> btrim(claim_title)
      or existing.story <> btrim(claim_story)
      or existing.attribution <> btrim(claim_attribution)
      or existing.visibility <> claim_visibility
      or existing.canonical_amount_minor <> proposed_amount_minor
      or existing.billing_country <> normalized_country
    then
      raise exception using errcode = '22023', message = 'idempotency_key_reused';
    end if;

    if existing.status in ('checkout_created', 'payment_verified', 'completed', 'conflict', 'refund_pending', 'refunded') then
      return query select existing.id, existing.provider, existing.display_amount_minor,
        existing.display_currency, existing.status, false, existing.provider_checkout_id, existing.expires_at;
      return;
    end if;

    if existing.status = 'creating_checkout' and existing.updated_at > now() - interval '2 minutes' then
      return query select existing.id, existing.provider, existing.display_amount_minor,
        existing.display_currency, existing.status, false, existing.provider_checkout_id, existing.expires_at;
      return;
    end if;

    update public.claim_checkout_intents
    set status = 'creating_checkout', failure_code = null,
      expires_at = now() + make_interval(secs => config.quote_ttl_seconds)
    where id = existing.id
    returning * into existing;

    return query select existing.id, existing.provider, existing.display_amount_minor,
      existing.display_currency, existing.status, true, existing.provider_checkout_id, existing.expires_at;
    return;
  end if;

  insert into public.calendar_dates (date_value)
  values (target_date)
  on conflict (date_value) do nothing;

  select * into day_record from public.calendar_dates day
  where day.date_value = target_date
  for update;

  if day_record.current_claim_id is not null then
    select * into current_claim from public.claims where id = day_record.current_claim_id;
  end if;

  minimum_amount := public.minimum_claim_amount(current_claim.canonical_amount_minor);
  if proposed_amount_minor < minimum_amount or proposed_amount_minor > config.maximum_claim_amount_minor then
    raise exception using errcode = '22023', message = 'invalid_claim_amount',
      detail = minimum_amount::text;
  end if;

  selected_display_amount := round(proposed_amount_minor * selected_fx)::bigint;

  insert into public.claim_checkout_intents (
    user_id, date_id, expected_current_claim_id, expected_date_version,
    title, story, attribution, visibility, canonical_amount_minor, display_amount_minor,
    display_currency, fx_rate_snapshot, billing_country, provider,
    idempotency_key, expires_at
  ) values (
    app_user_id, day_record.id, day_record.current_claim_id, day_record.version,
    btrim(claim_title), btrim(claim_story), btrim(claim_attribution), claim_visibility, proposed_amount_minor,
    selected_display_amount, selected_currency, selected_fx, normalized_country,
    selected_provider, request_idempotency_key,
    now() + make_interval(secs => config.quote_ttl_seconds)
  ) returning * into new_intent;

  return query select new_intent.id, new_intent.provider, new_intent.display_amount_minor,
    new_intent.display_currency, new_intent.status, true,
    new_intent.provider_checkout_id, new_intent.expires_at;
end;
$$;

create or replace function public.attach_claim_checkout(
  target_intent_id uuid,
  provider_checkout_reference text
)
returns table (checkout_intent_id uuid, claim_status text, checkout_reference text)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  app_user_id uuid := public.current_app_user_id();
  intent public.claim_checkout_intents%rowtype;
begin
  if app_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if provider_checkout_reference is null or char_length(provider_checkout_reference) not between 3 and 255 then
    raise exception using errcode = '22023', message = 'invalid_checkout_reference';
  end if;

  select * into intent from public.claim_checkout_intents
  where id = target_intent_id and user_id = app_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'checkout_not_found';
  end if;

  if intent.status = 'checkout_created' and intent.provider_checkout_id = provider_checkout_reference then
    return query select intent.id, intent.status, intent.provider_checkout_id;
    return;
  end if;
  if intent.status <> 'creating_checkout' then
    raise exception using errcode = '40001', message = 'invalid_checkout_state';
  end if;

  update public.claim_checkout_intents
  set provider_checkout_id = provider_checkout_reference, status = 'checkout_created'
  where id = intent.id
  returning * into intent;
  return query select intent.id, intent.status, intent.provider_checkout_id;
end;
$$;

create or replace function public.fail_claim_checkout(target_intent_id uuid, safe_failure_code text)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  app_user_id uuid := public.current_app_user_id();
begin
  if app_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  update public.claim_checkout_intents
  set status = 'failed', failure_code = left(coalesce(safe_failure_code, 'provider_error'), 50)
  where id = target_intent_id and user_id = app_user_id and status = 'creating_checkout';
end;
$$;

create or replace function public.get_my_claim_intent(target_intent_id uuid)
returns table (
  checkout_intent_id uuid,
  date_value date,
  title text,
  amount_minor bigint,
  currency text,
  claim_status text,
  failure_code text,
  expires_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select intent.id, day.date_value, intent.title, intent.display_amount_minor,
    intent.display_currency, intent.status, intent.failure_code,
    intent.expires_at, intent.updated_at
  from public.claim_checkout_intents intent
  join public.calendar_dates day on day.id = intent.date_id
  where intent.id = target_intent_id
    and intent.user_id = public.current_app_user_id();
$$;

create or replace function public.finalize_verified_claim(
  payment_provider text,
  provider_event_reference text,
  provider_checkout_reference text,
  provider_payment_reference text,
  paid_amount_minor bigint,
  paid_currency text,
  event_payload_digest text
)
returns table (
  transition_outcome text,
  checkout_intent_id uuid,
  claim_id uuid,
  intent_status text,
  refund_payment_reference text,
  refund_amount_minor bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  intent public.claim_checkout_intents%rowtype;
  day_record public.calendar_dates%rowtype;
  current_claim public.claims%rowtype;
  existing_event public.payment_provider_events%rowtype;
  existing_payment public.payment_records%rowtype;
  minimum_amount bigint;
  new_claim_id uuid;
  conflict_code text;
begin
  if payment_provider is null or provider_event_reference is null
    or provider_checkout_reference is null or provider_payment_reference is null
    or paid_amount_minor is null or paid_currency is null or event_payload_digest is null
    or payment_provider <> 'razorpay'
    or char_length(provider_event_reference) not between 3 and 255
    or char_length(provider_checkout_reference) not between 3 and 255
    or char_length(provider_payment_reference) not between 3 and 255
    or paid_amount_minor <= 0
    or upper(paid_currency) !~ '^[A-Z]{3}$'
    or event_payload_digest !~ '^[a-f0-9]{64}$'
  then
    raise exception using errcode = '22023', message = 'invalid_verified_payment';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(payment_provider || ':' || provider_event_reference, 0));

  select * into existing_event from public.payment_provider_events
  where provider = payment_provider and provider_event_id = provider_event_reference;
  if found then
    select * into intent from public.claim_checkout_intents where id = existing_event.checkout_intent_id;
    return query select 'already_processed'::text, intent.id, null::uuid, intent.status,
      intent.provider_payment_id, intent.display_amount_minor;
    return;
  end if;

  select * into intent from public.claim_checkout_intents
  where provider = payment_provider and provider_checkout_id = provider_checkout_reference
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'verified_checkout_not_found';
  end if;

  insert into public.payment_provider_events (
    provider, provider_event_id, checkout_intent_id, payload_digest
  ) values (payment_provider, provider_event_reference, intent.id, event_payload_digest)
  returning * into existing_event;

  if intent.status = 'completed' then
    update public.payment_provider_events set status = 'processed', outcome = 'already_completed', processed_at = now()
    where id = existing_event.id;
    return query select 'already_completed'::text, intent.id, null::uuid, intent.status,
      intent.provider_payment_id, intent.display_amount_minor;
    return;
  end if;

  select * into existing_payment from public.payment_records
  where provider = payment_provider and provider_payment_id = provider_payment_reference;
  if found and existing_payment.checkout_intent_id <> intent.id then
    raise exception using errcode = '23505', message = 'payment_reference_reused';
  end if;

  conflict_code := case
    when intent.status not in ('checkout_created', 'payment_verified', 'refund_pending') then 'invalid_intent_state'
    when intent.expires_at < now() then 'checkout_expired'
    when intent.display_amount_minor <> paid_amount_minor then 'amount_mismatch'
    when intent.display_currency <> upper(paid_currency) then 'currency_mismatch'
    else null
  end;

  insert into public.payment_records (
    checkout_intent_id, provider, provider_payment_id, amount_minor, currency, status
  ) values (
    intent.id, payment_provider, provider_payment_reference, paid_amount_minor,
    upper(paid_currency), case when conflict_code is null then 'captured' else 'refund_pending' end
  ) on conflict on constraint payment_records_checkout_intent_id_key do update set
    provider_payment_id = excluded.provider_payment_id,
    amount_minor = excluded.amount_minor,
    currency = excluded.currency,
    status = excluded.status;

  update public.claim_checkout_intents
  set provider_payment_id = provider_payment_reference, status = 'payment_verified'
  where id = intent.id
  returning * into intent;

  select * into day_record from public.calendar_dates where id = intent.date_id for update;
  if day_record.current_claim_id is not null then
    select * into current_claim from public.claims where id = day_record.current_claim_id;
  end if;
  minimum_amount := public.minimum_claim_amount(current_claim.canonical_amount_minor);

  if conflict_code is null and (
    day_record.version <> intent.expected_date_version
    or day_record.current_claim_id is distinct from intent.expected_current_claim_id
    or intent.canonical_amount_minor < minimum_amount
  ) then
    conflict_code := 'date_state_changed';
  end if;

  if conflict_code is not null then
    update public.claim_checkout_intents
    set status = 'refund_pending', failure_code = conflict_code
    where id = intent.id
    returning * into intent;
    update public.payment_records payment
    set status = 'refund_pending'
    where payment.checkout_intent_id = intent.id;
    update public.payment_provider_events set status = 'processed', outcome = conflict_code, processed_at = now()
    where id = existing_event.id;
    insert into public.audit_events (actor_user_id, action, target_type, target_id, metadata)
    values (intent.user_id, 'claim.payment_refund_required', 'claim_checkout_intent', intent.id::text,
      jsonb_build_object('reason', conflict_code, 'provider', payment_provider));
    return query select 'refund_required'::text, intent.id, null::uuid, intent.status,
      provider_payment_reference, paid_amount_minor;
    return;
  end if;

  if day_record.current_claim_id is not null then
    update public.claims
    set status = 'superseded', superseded_at = now()
    where id = day_record.current_claim_id and status = 'current';
  end if;

  insert into public.claims (
    date_id, claimant_user_id, title, story, attribution, visibility, status,
    canonical_amount_minor, display_amount_minor, display_currency,
    fx_rate_snapshot, claimed_at
  ) values (
    intent.date_id, intent.user_id, intent.title, intent.story, intent.attribution, intent.visibility, 'current',
    intent.canonical_amount_minor, intent.display_amount_minor, intent.display_currency,
    intent.fx_rate_snapshot, now()
  ) returning id into new_claim_id;

  update public.calendar_dates
  set current_claim_id = new_claim_id, version = version + 1
  where id = intent.date_id;

  insert into public.claim_events (
    date_id, claim_id, actor_user_id, event_type, amount_minor, currency, visibility_snapshot
  ) values (
    intent.date_id, new_claim_id, intent.user_id,
    case when intent.expected_current_claim_id is null then 'claimed' else 'outbid' end,
    intent.display_amount_minor, intent.display_currency, intent.visibility
  );

  update public.claim_checkout_intents set status = 'completed', failure_code = null where id = intent.id;
  update public.payment_records payment
  set status = 'captured'
  where payment.checkout_intent_id = intent.id;
  update public.payment_provider_events set status = 'processed', outcome = 'claim_completed', processed_at = now()
  where id = existing_event.id;
  insert into public.audit_events (actor_user_id, action, target_type, target_id, metadata)
  values (intent.user_id, 'claim.completed', 'claim', new_claim_id::text,
    jsonb_build_object('provider', payment_provider, 'checkout_intent_id', intent.id));

  return query select 'completed'::text, intent.id, new_claim_id, 'completed'::text,
    null::text, null::bigint;
end;
$$;

create or replace function public.mark_claim_payment_refunded(
  target_intent_id uuid,
  provider_refund_reference text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  intent public.claim_checkout_intents%rowtype;
begin
  if provider_refund_reference is null or char_length(provider_refund_reference) not between 3 and 255 then
    raise exception using errcode = '22023', message = 'invalid_refund_reference';
  end if;
  select * into intent from public.claim_checkout_intents where id = target_intent_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'checkout_not_found'; end if;
  if intent.status = 'refunded' then return; end if;
  if intent.status <> 'refund_pending' then
    raise exception using errcode = '40001', message = 'refund_not_allowed';
  end if;
  update public.claim_checkout_intents set status = 'refunded' where id = intent.id;
  update public.payment_records set status = 'refunded', refunded_at = now() where checkout_intent_id = intent.id;
  insert into public.audit_events (actor_user_id, action, target_type, target_id, metadata)
  values (intent.user_id, 'claim.payment_refunded', 'claim_checkout_intent', intent.id::text,
    jsonb_build_object('refund_reference', provider_refund_reference));
end;
$$;

revoke all on function public.minimum_claim_amount(bigint) from public;
revoke all on function public.get_claim_quote(date) from public;
revoke all on function public.create_claim_checkout_intent(date, text, text, text, text, bigint, text, text) from public;
revoke all on function public.attach_claim_checkout(uuid, text) from public;
revoke all on function public.fail_claim_checkout(uuid, text) from public;
revoke all on function public.get_my_claim_intent(uuid) from public;
revoke all on function public.finalize_verified_claim(text, text, text, text, bigint, text, text) from public;
revoke all on function public.mark_claim_payment_refunded(uuid, text) from public;

grant execute on function public.get_claim_quote(date) to anon, authenticated;
grant execute on function public.create_claim_checkout_intent(date, text, text, text, text, bigint, text, text) to authenticated;
grant execute on function public.attach_claim_checkout(uuid, text) to authenticated;
grant execute on function public.fail_claim_checkout(uuid, text) to authenticated;
grant execute on function public.get_my_claim_intent(uuid) to authenticated;
grant execute on function public.finalize_verified_claim(text, text, text, text, bigint, text, text) to service_role;
grant execute on function public.mark_claim_payment_refunded(uuid, text) to service_role;

commit;
