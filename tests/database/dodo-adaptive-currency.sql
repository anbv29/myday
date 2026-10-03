-- Run in Supabase SQL Editor. Every fixture and simulated payment is rolled back.
begin;
set local role service_role;
do $$
declare first_intent uuid; second_intent uuid; result record;
begin
  if exists (select 1 from public.calendar_dates where date_value = date '2099-12-28' and current_claim_id is not null) then
    raise exception 'Test date already claimed; select an unused date before running.';
  end if;
  select checkout_intent_id into first_intent from public.create_anonymous_claim_checkout_intent(
    date '2099-12-28', 'Rollback test', 'Never persisted test fixture', '@rollback_test', 'private', 100, 'IN', 'rollback_adaptive_first');
  select checkout_intent_id into second_intent from public.create_anonymous_claim_checkout_intent(
    date '2099-12-28', 'Rollback test', 'Never persisted stale fixture', '@rollback_test', 'private', 200, 'IN', 'rollback_adaptive_second');
  perform public.attach_anonymous_claim_checkout(first_intent, 'rollback_adaptive_first', 'cks_rollback_first');
  perform public.attach_anonymous_claim_checkout(second_intent, 'rollback_adaptive_second', 'cks_rollback_second');
  begin
    perform public.finalize_adaptive_dodo_claim(first_intent, 200, 'evt_bad', 'cks_rollback_first', 'pay_bad', 9500, 'INR', repeat('a',64));
    raise exception 'Mismatched USD binding accepted';
  exception when invalid_parameter_value then null; end;
  select * into result from public.finalize_adaptive_dodo_claim(first_intent, 100,
    'evt_rollback_first', 'cks_rollback_first', 'pay_rollback_first', 9500, 'INR', repeat('a',64));
  if result.transition_outcome <> 'completed' then raise exception 'INR claim not completed'; end if;
  if not exists (select 1 from public.claims where id = result.claim_id and canonical_amount_minor = 100
    and display_amount_minor = 9500 and display_currency = 'INR') then raise exception 'Incorrect rank or receipt'; end if;
  select * into result from public.finalize_adaptive_dodo_claim(first_intent, 100,
    'evt_rollback_first', 'cks_rollback_first', 'pay_rollback_first', 9500, 'INR', repeat('a',64));
  if result.transition_outcome <> 'already_processed' then raise exception 'Replay not idempotent'; end if;
  select * into result from public.finalize_adaptive_dodo_claim(second_intent, 200,
    'evt_rollback_second', 'cks_rollback_second', 'pay_rollback_second', 19000, 'INR', repeat('b',64));
  if result.transition_outcome <> 'refund_required' or result.refund_amount_minor <> 19000 then
    raise exception 'Stale payment did not retain exact INR refund'; end if;
end;
$$;
select true as inr_completion_usd_ranking_replay_and_refund_passed;
rollback;
