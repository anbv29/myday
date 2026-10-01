-- Preserve old payments and all existing claim/locking/RLS rules; switch new intents only.
begin;
alter table public.claim_checkout_intents drop constraint claim_checkout_provider;
alter table public.claim_checkout_intents add constraint claim_checkout_provider check (provider in ('razorpay', 'dodo'));
alter table public.payment_records drop constraint payment_records_provider;
alter table public.payment_records add constraint payment_records_provider check (provider in ('razorpay', 'dodo'));
alter table public.payment_provider_events drop constraint payment_provider_events_provider;
alter table public.payment_provider_events add constraint payment_provider_events_provider check (provider in ('razorpay', 'dodo'));

-- Patch only provider literals in the installed functions, retaining deployed fixes.
-- Guards abort the whole migration if the expected definitions are not present.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.create_claim_checkout_intent(date,text,text,text,text,bigint,text,text)'::regprocedure);
  if strpos(definition, 'selected_provider := ''razorpay'';') = 0 then
    raise exception 'Unexpected checkout function. Review provider migration before applying.';
  end if;
  execute replace(definition, 'selected_provider := ''razorpay'';', 'selected_provider := ''dodo'';');
  definition := pg_get_functiondef('public.finalize_verified_claim(text,text,text,text,bigint,text,text)'::regprocedure);
  if strpos(definition, 'payment_provider <> ''razorpay''') = 0 then
    raise exception 'Unexpected finalization function. Review provider migration before applying.';
  end if;
  execute replace(definition, 'payment_provider <> ''razorpay''', 'payment_provider not in (''razorpay'', ''dodo'')');
end;
$$;
commit;
