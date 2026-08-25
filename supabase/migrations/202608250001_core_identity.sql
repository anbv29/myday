begin;

create extension if not exists pgcrypto;

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  is_disabled boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_users_clerk_user_id_length check (char_length(clerk_user_id) between 6 and 128)
);

create table public.user_profiles (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  username text,
  normalized_username text,
  display_name text,
  bio text,
  avatar_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_username_shape check (
    username is null or username ~ '^[A-Za-z0-9_]{3,20}$'
  ),
  constraint user_profiles_normalized_username_shape check (
    normalized_username is null or normalized_username ~ '^[a-z0-9_]{3,20}$'
  ),
  constraint user_profiles_username_pair check (
    (username is null and normalized_username is null)
    or (username is not null and normalized_username is not null)
  ),
  constraint user_profiles_display_name_length check (
    display_name is null or char_length(display_name) between 1 and 60
  ),
  constraint user_profiles_bio_length check (bio is null or char_length(bio) <= 280),
  constraint user_profiles_avatar_url_length check (
    avatar_url is null or char_length(avatar_url) <= 2048
  )
);

create unique index user_profiles_normalized_username_unique
  on public.user_profiles (normalized_username)
  where normalized_username is not null;

create index user_profiles_public_username_idx
  on public.user_profiles (normalized_username, user_id)
  where username is not null;

create table public.user_settings (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  email_claim_updates boolean not null default true,
  email_outbid_alerts boolean not null default true,
  email_product_updates boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reserved_usernames (
  normalized_username text primary key,
  reason text not null default 'reserved',
  created_at timestamptz not null default now(),
  constraint reserved_usernames_shape check (
    normalized_username ~ '^[a-z0-9_]{3,20}$'
  )
);

insert into public.reserved_usernames (normalized_username, reason)
values
  ('admin', 'platform'),
  ('administrator', 'platform'),
  ('api', 'platform'),
  ('billing', 'platform'),
  ('contact', 'platform'),
  ('explore', 'route'),
  ('faq', 'route'),
  ('help', 'platform'),
  ('leaderboard', 'route'),
  ('login', 'route'),
  ('logout', 'route'),
  ('myday', 'brand'),
  ('myday', 'brand'),
  ('notifications', 'route'),
  ('official', 'platform'),
  ('privacy', 'route'),
  ('root', 'platform'),
  ('search', 'route'),
  ('security', 'platform'),
  ('settings', 'route'),
  ('signup', 'route'),
  ('support', 'route'),
  ('system', 'platform'),
  ('terms', 'route'),
  ('trending', 'route')
on conflict (normalized_username) do nothing;

create table public.identity_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'clerk',
  provider_event_id text not null,
  event_type text not null,
  status text not null default 'processing',
  attempt_count integer not null default 1,
  last_error_code text,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint identity_webhook_events_provider check (provider = 'clerk'),
  constraint identity_webhook_events_status check (
    status in ('processing', 'processed', 'failed')
  ),
  constraint identity_webhook_events_attempts check (attempt_count between 1 and 25),
  unique (provider, provider_event_id)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.app_users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  outcome text not null default 'success',
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_outcome check (outcome in ('success', 'denied', 'failed')),
  constraint audit_events_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index audit_events_actor_created_idx
  on public.audit_events (actor_user_id, created_at desc);
create index audit_events_action_created_idx
  on public.audit_events (action, created_at desc);

create or replace function public.normalize_username(input_username text)
returns text
language sql
immutable
strict
parallel safe
as $$
  select lower(btrim(input_username));
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.set_normalized_username()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.username is null then
    new.normalized_username := null;
  else
    new.username := btrim(new.username);
    new.normalized_username := public.normalize_username(new.username);
  end if;
  return new;
end;
$$;

create trigger app_users_set_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

create trigger user_profiles_set_normalized_username
before insert or update of username, normalized_username on public.user_profiles
for each row execute function public.set_normalized_username();

create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

create trigger identity_webhook_events_set_updated_at
before update on public.identity_webhook_events
for each row execute function public.set_updated_at();

create or replace function public.current_clerk_user_id()
returns text
language sql
stable
security invoker
set search_path = public, auth, pg_temp
as $$
  select nullif(auth.jwt() ->> 'sub', '');
$$;

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select id
  from public.app_users
  where clerk_user_id = public.current_clerk_user_id()
    and deleted_at is null
    and is_disabled = false;
$$;

create or replace function public.is_active_app_user(candidate_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.app_users
    where id = candidate_user_id
      and deleted_at is null
      and is_disabled = false
  );
$$;

create or replace function public.ensure_app_user()
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  clerk_id text := public.current_clerk_user_id();
  app_user_id uuid;
begin
  if clerk_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  insert into public.app_users (clerk_user_id)
  values (clerk_id)
  on conflict (clerk_user_id) do update
    set updated_at = public.app_users.updated_at
  returning id into app_user_id;

  if exists (
    select 1 from public.app_users
    where id = app_user_id and (is_disabled = true or deleted_at is not null)
  ) then
    raise exception using errcode = '42501', message = 'account_unavailable';
  end if;

  insert into public.user_profiles (user_id)
  values (app_user_id)
  on conflict (user_id) do nothing;

  insert into public.user_settings (user_id)
  values (app_user_id)
  on conflict (user_id) do nothing;

  return app_user_id;
end;
$$;

create or replace function public.is_username_available(candidate text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  normalized text := public.normalize_username(candidate);
begin
  if candidate is null or candidate !~ '^[A-Za-z0-9_]{3,20}$' then
    return false;
  end if;

  return not exists (
    select 1 from public.reserved_usernames where normalized_username = normalized
  ) and not exists (
    select 1 from public.user_profiles where normalized_username = normalized
  );
end;
$$;

create or replace function public.claim_username(candidate text)
returns table (
  user_id uuid,
  username text,
  normalized_username text,
  onboarding_completed boolean
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  normalized text := public.normalize_username(candidate);
  app_user_id uuid;
begin
  if candidate is null or candidate !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception using errcode = '22023', message = 'invalid_username';
  end if;

  if exists (
    select 1 from public.reserved_usernames where reserved_usernames.normalized_username = normalized
  ) then
    raise exception using errcode = '23505', message = 'username_unavailable';
  end if;

  app_user_id := public.ensure_app_user();

  begin
    update public.user_profiles
    set username = btrim(candidate), onboarding_completed = true
    where public.user_profiles.user_id = app_user_id;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'username_unavailable';
  end;

  insert into public.audit_events (actor_user_id, action, target_type, target_id)
  values (app_user_id, 'username.claimed', 'user_profile', app_user_id::text);

  return query
    select profile.user_id, profile.username, profile.normalized_username, profile.onboarding_completed
    from public.user_profiles profile
    where profile.user_id = app_user_id;
end;
$$;

create or replace function public.get_my_profile()
returns table (
  user_id uuid,
  username text,
  normalized_username text,
  display_name text,
  bio text,
  avatar_url text,
  onboarding_completed boolean
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  app_user_id uuid := public.current_app_user_id();
begin
  if app_user_id is null then
    return;
  end if;

  return query
    select profile.user_id, profile.username, profile.normalized_username,
      profile.display_name, profile.bio, profile.avatar_url, profile.onboarding_completed
    from public.user_profiles profile
    where profile.user_id = app_user_id;
end;
$$;

alter table public.app_users enable row level security;
alter table public.app_users force row level security;
alter table public.user_profiles enable row level security;
alter table public.user_profiles force row level security;
alter table public.user_settings enable row level security;
alter table public.user_settings force row level security;
alter table public.reserved_usernames enable row level security;
alter table public.reserved_usernames force row level security;
alter table public.identity_webhook_events enable row level security;
alter table public.identity_webhook_events force row level security;
alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;

create policy app_users_select_own
on public.app_users for select to authenticated
using (clerk_user_id = public.current_clerk_user_id());

create policy user_profiles_select_public
on public.user_profiles for select to anon, authenticated
using (
  username is not null
  and public.is_active_app_user(user_id)
);

create policy user_profiles_select_own
on public.user_profiles for select to authenticated
using (user_id = public.current_app_user_id());

create policy user_settings_select_own
on public.user_settings for select to authenticated
using (user_id = public.current_app_user_id());

create policy user_settings_update_own
on public.user_settings for update to authenticated
using (user_id = public.current_app_user_id())
with check (user_id = public.current_app_user_id());

revoke all on public.app_users from anon, authenticated;
revoke all on public.user_profiles from anon, authenticated;
revoke all on public.user_settings from anon, authenticated;
revoke all on public.reserved_usernames from anon, authenticated;
revoke all on public.identity_webhook_events from anon, authenticated;
revoke all on public.audit_events from anon, authenticated;

grant select on public.app_users to authenticated;
grant select on public.user_profiles to anon, authenticated;
grant select, update (
  email_claim_updates,
  email_outbid_alerts,
  email_product_updates
) on public.user_settings to authenticated;

revoke all on function public.ensure_app_user() from public;
revoke all on function public.current_app_user_id() from public;
revoke all on function public.is_active_app_user(uuid) from public;
revoke all on function public.is_username_available(text) from public;
revoke all on function public.claim_username(text) from public;
revoke all on function public.get_my_profile() from public;

grant execute on function public.ensure_app_user() to authenticated;
grant execute on function public.current_app_user_id() to authenticated;
grant execute on function public.is_active_app_user(uuid) to anon, authenticated;
grant execute on function public.is_username_available(text) to authenticated;
grant execute on function public.claim_username(text) to authenticated;
grant execute on function public.get_my_profile() to authenticated;

commit;
