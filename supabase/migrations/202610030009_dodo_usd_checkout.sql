-- New Dodo PWYW purchases use USD. Preserve country, history, locks and old intents.
begin;
do $$
declare
  definition text;
  old_currency text := 'selected_currency := case when normalized_country = ''IN'' then ''INR'' else ''USD'' end;';
  old_fx text := 'selected_fx := case when normalized_country = ''IN'' then config.usd_to_inr_rate else 1 end;';
begin
  definition := pg_get_functiondef('public.create_claim_checkout_intent(date,text,text,text,text,bigint,text,text)'::regprocedure);
  if strpos(definition, 'selected_provider := ''dodo'';') = 0
    or strpos(definition, old_currency) = 0
    or strpos(definition, old_fx) = 0
    or strpos(definition, 'if normalized_country = ''IN'' and (') = 0 then
    raise exception 'Unexpected checkout definition. Apply Dodo migration first and review before proceeding.';
  end if;
  definition := replace(definition, old_currency, 'selected_currency := ''USD'';');
  definition := replace(definition, old_fx, 'selected_fx := 1;');
  definition := replace(definition, 'if normalized_country = ''IN'' and (', 'if selected_currency = ''INR'' and (');
  execute definition;
end;
$$;
commit;
