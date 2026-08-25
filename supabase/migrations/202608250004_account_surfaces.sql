begin;

create or replace function public.get_my_account_summary()
returns table (
  user_id uuid,
  username text,
  normalized_username text,
  display_name text,
  bio text,
  onboarding_completed boolean,
  email_claim_updates boolean,
  email_outbid_alerts boolean,
  email_product_updates boolean,
  current_claim_count integer,
  historical_claim_count integer,
  total_claim_value_minor bigint,
  open_checkout_count integer
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    profile.user_id,
    profile.username,
    profile.normalized_username,
    profile.display_name,
    profile.bio,
    profile.onboarding_completed,
    settings.email_claim_updates,
    settings.email_outbid_alerts,
    settings.email_product_updates,
    (select count(*)::integer from public.claims claim
      where claim.claimant_user_id = profile.user_id and claim.status = 'current'),
    (select count(*)::integer from public.claims claim
      where claim.claimant_user_id = profile.user_id and claim.status = 'superseded'),
    (select coalesce(sum(claim.canonical_amount_minor), 0)::bigint from public.claims claim
      where claim.claimant_user_id = profile.user_id and claim.status in ('current', 'superseded')),
    (select count(*)::integer from public.claim_checkout_intents intent
      where intent.user_id = profile.user_id
        and intent.status in ('creating_checkout', 'checkout_created', 'payment_verified', 'refund_pending'))
  from public.user_profiles profile
  join public.user_settings settings on settings.user_id = profile.user_id
  where profile.user_id = public.current_app_user_id();
$$;

create or replace function public.get_my_claims(result_limit integer default 50)
returns table (
  claim_id uuid,
  date_value date,
  title text,
  story text,
  attribution text,
  visibility text,
  claim_status text,
  canonical_amount_minor bigint,
  display_amount_minor bigint,
  display_currency text,
  claimed_at timestamptz,
  superseded_at timestamptz,
  is_current boolean
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    claim.id,
    day.date_value,
    claim.title,
    claim.story,
    claim.attribution,
    claim.visibility,
    claim.status,
    claim.canonical_amount_minor,
    claim.display_amount_minor,
    claim.display_currency,
    claim.claimed_at,
    claim.superseded_at,
    day.current_claim_id = claim.id
  from public.claims claim
  join public.calendar_dates day on day.id = claim.date_id
  where claim.claimant_user_id = public.current_app_user_id()
    and claim.status in ('current', 'superseded', 'voided', 'refunded')
  order by claim.claimed_at desc, claim.id
  limit least(greatest(coalesce(result_limit, 50), 1), 100);
$$;

create or replace function public.get_my_checkout_activity(result_limit integer default 25)
returns table (
  checkout_intent_id uuid,
  date_value date,
  title text,
  amount_minor bigint,
  currency text,
  checkout_status text,
  failure_code text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    intent.id,
    day.date_value,
    intent.title,
    intent.display_amount_minor,
    intent.display_currency,
    intent.status,
    intent.failure_code,
    intent.created_at,
    intent.updated_at
  from public.claim_checkout_intents intent
  join public.calendar_dates day on day.id = intent.date_id
  where intent.user_id = public.current_app_user_id()
  order by intent.created_at desc, intent.id desc
  limit least(greatest(coalesce(result_limit, 25), 1), 50);
$$;

create or replace function public.update_my_profile(new_display_name text, new_bio text)
returns table (saved_display_name text, saved_bio text, saved_updated_at timestamptz)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  app_user_id uuid := public.current_app_user_id();
  normalized_display_name text := nullif(btrim(new_display_name), '');
  normalized_bio text := nullif(btrim(new_bio), '');
begin
  if app_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if normalized_display_name is not null and char_length(normalized_display_name) > 60 then
    raise exception using errcode = '22023', message = 'invalid_display_name';
  end if;
  if normalized_bio is not null and char_length(normalized_bio) > 280 then
    raise exception using errcode = '22023', message = 'invalid_bio';
  end if;

  update public.user_profiles profile
  set display_name = normalized_display_name, bio = normalized_bio
  where profile.user_id = app_user_id;

  insert into public.audit_events (actor_user_id, action, target_type, target_id, metadata)
  values (app_user_id, 'profile.updated', 'user_profile', app_user_id::text,
    jsonb_build_object('display_name_set', normalized_display_name is not null, 'bio_set', normalized_bio is not null));

  return query select profile.display_name, profile.bio, profile.updated_at
  from public.user_profiles profile where profile.user_id = app_user_id;
end;
$$;

create or replace function public.update_my_notification_settings(
  new_email_claim_updates boolean,
  new_email_outbid_alerts boolean,
  new_email_product_updates boolean
)
returns table (
  saved_email_claim_updates boolean,
  saved_email_outbid_alerts boolean,
  saved_email_product_updates boolean,
  saved_updated_at timestamptz
)
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
  if new_email_claim_updates is null or new_email_outbid_alerts is null or new_email_product_updates is null then
    raise exception using errcode = '22023', message = 'invalid_notification_settings';
  end if;

  update public.user_settings settings
  set email_claim_updates = new_email_claim_updates,
    email_outbid_alerts = new_email_outbid_alerts,
    email_product_updates = new_email_product_updates
  where settings.user_id = app_user_id;

  insert into public.audit_events (actor_user_id, action, target_type, target_id, metadata)
  values (app_user_id, 'notifications.updated', 'user_settings', app_user_id::text,
    jsonb_build_object(
      'claim_updates', new_email_claim_updates,
      'outbid_alerts', new_email_outbid_alerts,
      'product_updates', new_email_product_updates
    ));

  return query select settings.email_claim_updates, settings.email_outbid_alerts,
    settings.email_product_updates, settings.updated_at
  from public.user_settings settings where settings.user_id = app_user_id;
end;
$$;

revoke all on function public.get_my_account_summary() from public;
revoke all on function public.get_my_claims(integer) from public;
revoke all on function public.get_my_checkout_activity(integer) from public;
revoke all on function public.update_my_profile(text, text) from public;
revoke all on function public.update_my_notification_settings(boolean, boolean, boolean) from public;

grant execute on function public.get_my_account_summary() to authenticated;
grant execute on function public.get_my_claims(integer) to authenticated;
grant execute on function public.get_my_checkout_activity(integer) to authenticated;
grant execute on function public.update_my_profile(text, text) to authenticated;
grant execute on function public.update_my_notification_settings(boolean, boolean, boolean) to authenticated;

commit;
