begin;

-- Separate free records preserve the positive-amount paid claim/payment contracts.
create table public.free_date_registrations (
  id uuid primary key default gen_random_uuid(),
  date_id uuid not null unique references public.calendar_dates(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 100),
  story text not null check (char_length(story) between 3 and 1000),
  attribution text not null check (
    char_length(attribution) between 3 and 200
    and (attribution ~ '^@[A-Za-z0-9._]{2,40}$' or attribution ~ '^https://')
  ),
  registered_at timestamptz not null default now()
);
alter table public.free_date_registrations enable row level security;
revoke all on public.free_date_registrations from public, anon, authenticated;
grant select on public.free_date_registrations to service_role;

-- Even private/unlisted paid holders suppress a free entry. Never expose paid metadata.
create view public.visible_free_date_registrations as
select registration.id, day.date_value, registration.title, registration.story,
  registration.attribution, registration.registered_at
from public.free_date_registrations registration
join public.calendar_dates day on day.id = registration.date_id
where day.current_claim_id is null;
revoke all on public.visible_free_date_registrations from public, anon, authenticated;
grant select on public.visible_free_date_registrations to service_role;

create or replace function public.register_free_date(
  target_date date, registration_title text, registration_story text,
  registration_attribution text
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  day public.calendar_dates%rowtype;
  existing public.free_date_registrations%rowtype;
  registration_id uuid;
begin
  if target_date is null or target_date < date '1900-01-01' or target_date > date '2100-12-31'
    or registration_title is null or registration_story is null or registration_attribution is null
  then raise exception using errcode = '22023', message = 'invalid_registration'; end if;
  insert into public.calendar_dates (date_value) values (target_date)
    on conflict (date_value) do nothing;
  -- Same date-row lock as paid checkout finalization: a free entry cannot overwrite it.
  select * into day from public.calendar_dates where date_value = target_date for update;
  if day.current_claim_id is not null then
    raise exception using errcode = 'P0001', message = 'date_has_paid_claim';
  end if;
  select * into existing from public.free_date_registrations where date_id = day.id;
  if found then
    if lower(existing.attribution) = lower(btrim(registration_attribution))
      and existing.title = btrim(registration_title) and existing.story = btrim(registration_story)
    then return existing.id; end if;
    raise exception using errcode = 'P0001', message = 'date_already_registered';
  end if;
  insert into public.free_date_registrations (date_id, title, story, attribution)
  values (day.id, btrim(registration_title), btrim(registration_story), btrim(registration_attribution))
  returning id into registration_id;
  return registration_id;
end;
$$;

revoke all on function public.register_free_date(date, text, text, text) from public, anon, authenticated;
grant execute on function public.register_free_date(date, text, text, text) to service_role;
commit;
