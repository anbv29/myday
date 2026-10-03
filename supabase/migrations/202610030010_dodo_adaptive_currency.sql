-- The server locks the USD cart amount and signs its binding to the intent.
-- Only a signed Dodo success with a verified binding reaches this service-only RPC.
-- Keep canonical USD ranking, actual INR receipts/refunds, locks and old payments.
begin;
create or replace function public.finalize_adaptive_dodo_claim(
  bound_intent_id uuid, base_amount_minor bigint,
  provider_event_reference text, provider_checkout_reference text,
  provider_payment_reference text, paid_amount_minor bigint,
  paid_currency text, event_payload_digest text
)
returns table (transition_outcome text, checkout_intent_id uuid, claim_id uuid,
  intent_status text, refund_payment_reference text, refund_amount_minor bigint)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare intent public.claim_checkout_intents%rowtype;
begin
  select * into intent from public.claim_checkout_intents
  where provider = 'dodo' and provider_checkout_id = provider_checkout_reference for update;
  if not found or intent.id is distinct from bound_intent_id
    or intent.billing_country <> 'IN'
    or base_amount_minor is null or base_amount_minor < 100
    or intent.canonical_amount_minor <> base_amount_minor
    or paid_currency is distinct from 'INR'
    or paid_amount_minor is null or paid_amount_minor < 500 then
    raise exception using errcode = '22023', message = 'invalid_adaptive_payment_binding';
  end if;
  -- A retry must never rewrite the receipt of an already verified payment.
  if intent.display_currency = 'USD' and intent.display_amount_minor = base_amount_minor
    and intent.status not in ('completed', 'refunded') then
    update public.claim_checkout_intents set display_amount_minor = paid_amount_minor,
      display_currency = 'INR', fx_rate_snapshot = paid_amount_minor::numeric / base_amount_minor
    where id = intent.id;
  elsif intent.display_currency <> 'INR' or intent.display_amount_minor <> paid_amount_minor then
    raise exception using errcode = '22023', message = 'adaptive_receipt_mismatch';
  end if;
  return query select * from public.finalize_verified_claim('dodo', provider_event_reference,
    provider_checkout_reference, provider_payment_reference, paid_amount_minor, paid_currency, event_payload_digest);
end;
$$;
revoke all on function public.finalize_adaptive_dodo_claim(uuid,bigint,text,text,text,bigint,text,text) from public;
grant execute on function public.finalize_adaptive_dodo_claim(uuid,bigint,text,text,text,bigint,text,text) to service_role;
commit;
