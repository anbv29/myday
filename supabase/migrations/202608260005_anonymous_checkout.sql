begin;

-- Anonymous buyers are represented by a deterministic, internal app-user row.
-- Their submitted attribution remains the only public-facing identity. The
-- internal identifier exists solely to preserve claim and audit foreign keys.
create or replace function public.ensure_anonymous_buyer(claim_attribution text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_attribution text := lower(btrim(claim_attribution));
  attribution_digest text;
  anonymous_subject text;
  anonymous_username text;
  app_user_id uuid;
begin
  if claim_attribution is null
    or char_length(btrim(claim_attribution)) not between 3 and 200
    or not (
      btrim(claim_attribution) ~ '^@[A-Za-z0-9._]{2,40}$'
      or btrim(claim_attribution) ~ '^https://'
    )
  then
    raise exception using errcode = '22023', message = 'invalid_attribution';
  end if;

  attribution_digest := encode(digest(normalized_attribution, 'sha256'), 'hex');
  anonymous_subject := 'anon:' || attribution_digest;
  anonymous_username := 'buyer_' || left(attribution_digest, 14);

  insert into public.app_users (clerk_user_id)
  values (anonymous_subject)
  on conflict (clerk_user_id) do update
    set updated_at = public.app_users.updated_at
  returning id into app_user_id;

  insert into public.user_profiles (
    user_id, username, display_name, onboarding_completed
  ) values (
    app_user_id, anonymous_username, left(btrim(claim_attribution), 60), true
  )
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    onboarding_completed = true;

  return app_user_id;
end;
$$;

create or replace function public.create_anonymous_claim_checkout_intent(
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
  anonymous_user_id uuid;
  anonymous_subject text;
begin
  anonymous_user_id := public.ensure_anonymous_buyer(claim_attribution);
  select clerk_user_id into anonymous_subject
  from public.app_users
  where id = anonymous_user_id and clerk_user_id like 'anon:%';

  if anonymous_subject is null then
    raise exception using errcode = '42501', message = 'anonymous_identity_unavailable';
  end if;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', anonymous_subject)::text,
    true
  );

  return query
    select * from public.create_claim_checkout_intent(
      target_date,
      claim_title,
      claim_story,
      claim_attribution,
      claim_visibility,
      proposed_amount_minor,
      billing_country_code,
      request_idempotency_key
    );
end;
$$;

create or replace function public.attach_anonymous_claim_checkout(
  target_intent_id uuid,
  request_access_key text,
  provider_checkout_reference text
)
returns table (checkout_intent_id uuid, claim_status text, checkout_reference text)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  anonymous_subject text;
begin
  select app_user.clerk_user_id into anonymous_subject
  from public.claim_checkout_intents intent
  join public.app_users app_user on app_user.id = intent.user_id
  where intent.id = target_intent_id
    and intent.idempotency_key = request_access_key
    and app_user.clerk_user_id like 'anon:%';

  if anonymous_subject is null then
    raise exception using errcode = 'P0002', message = 'checkout_not_found';
  end if;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', anonymous_subject)::text,
    true
  );

  return query
    select * from public.attach_claim_checkout(
      target_intent_id,
      provider_checkout_reference
    );
end;
$$;

create or replace function public.fail_anonymous_claim_checkout(
  target_intent_id uuid,
  request_access_key text,
  safe_failure_code text
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  anonymous_subject text;
begin
  select app_user.clerk_user_id into anonymous_subject
  from public.claim_checkout_intents intent
  join public.app_users app_user on app_user.id = intent.user_id
  where intent.id = target_intent_id
    and intent.idempotency_key = request_access_key
    and app_user.clerk_user_id like 'anon:%';

  if anonymous_subject is null then
    raise exception using errcode = 'P0002', message = 'checkout_not_found';
  end if;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', anonymous_subject)::text,
    true
  );
  perform public.fail_claim_checkout(target_intent_id, safe_failure_code);
end;
$$;

create or replace function public.get_anonymous_claim_intent(
  target_intent_id uuid,
  request_access_key text
)
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
set search_path = public, pg_temp
as $$
  select intent.id, day.date_value, intent.title, intent.display_amount_minor,
    intent.display_currency, intent.status, intent.failure_code,
    intent.expires_at, intent.updated_at
  from public.claim_checkout_intents intent
  join public.calendar_dates day on day.id = intent.date_id
  join public.app_users app_user on app_user.id = intent.user_id
  where intent.id = target_intent_id
    and intent.idempotency_key = request_access_key
    and app_user.clerk_user_id like 'anon:%';
$$;

revoke all on function public.ensure_anonymous_buyer(text) from public;
revoke all on function public.create_anonymous_claim_checkout_intent(date, text, text, text, text, bigint, text, text) from public;
revoke all on function public.attach_anonymous_claim_checkout(uuid, text, text) from public;
revoke all on function public.fail_anonymous_claim_checkout(uuid, text, text) from public;
revoke all on function public.get_anonymous_claim_intent(uuid, text) from public;

grant execute on function public.ensure_anonymous_buyer(text) to service_role;
grant execute on function public.create_anonymous_claim_checkout_intent(date, text, text, text, text, bigint, text, text) to service_role;
grant execute on function public.attach_anonymous_claim_checkout(uuid, text, text) to service_role;
grant execute on function public.fail_anonymous_claim_checkout(uuid, text, text) to service_role;
grant execute on function public.get_anonymous_claim_intent(uuid, text) to service_role;

-- The previous authenticated checkout path is intentionally closed. Historical
-- Clerk-backed claims remain readable through the existing public views.
revoke execute on function public.create_claim_checkout_intent(date, text, text, text, text, bigint, text, text) from authenticated;
revoke execute on function public.attach_claim_checkout(uuid, text) from authenticated;
revoke execute on function public.fail_claim_checkout(uuid, text) from authenticated;
revoke execute on function public.get_my_claim_intent(uuid) from authenticated;

commit;
