begin;

-- Supabase installs pgcrypto in the extensions schema. The function uses a
-- deliberately restricted search_path, so the digest routine must be schema
-- qualified when it executes during anonymous checkout.
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

  attribution_digest := encode(extensions.digest(normalized_attribution, 'sha256'), 'hex');
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

commit;

notify pgrst, 'reload schema';
