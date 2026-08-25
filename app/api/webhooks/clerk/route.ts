import { verifyWebhook } from '@clerk/backend/webhooks';
import { createAdminSupabaseClient } from '@/server/supabase/admin';

export async function POST(request: Request) {
  let event;
  try {
    event = await verifyWebhook(request);
  } catch {
    return Response.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const eventId = request.headers.get('webhook-id');
  const eventType = event.type;

  if (!eventId) {
    return Response.json({ error: 'Missing verified webhook identifier.' }, { status: 400 });
  }

  const { error: eventInsertError } = await supabase
    .from('identity_webhook_events')
    .insert({ provider: 'clerk', provider_event_id: eventId, event_type: eventType });

  if (eventInsertError?.code === '23505') {
    const { data: existing } = await supabase
      .from('identity_webhook_events')
      .select('status,attempt_count,updated_at')
      .eq('provider', 'clerk')
      .eq('provider_event_id', eventId)
      .maybeSingle();

    if (existing?.status === 'processed') {
      return Response.json({ received: true, duplicate: true });
    }

    const staleProcessing = existing?.status === 'processing'
      && Date.now() - new Date(existing.updated_at).getTime() > 5 * 60_000;

    if ((existing?.status === 'failed' || staleProcessing) && existing.attempt_count < 25) {
      const { error: retryError } = await supabase
        .from('identity_webhook_events')
        .update({ status: 'processing', attempt_count: existing.attempt_count + 1, last_error_code: null })
        .eq('provider', 'clerk')
        .eq('provider_event_id', eventId)
        .eq('status', existing.status);
      if (retryError) return Response.json({ error: 'Webhook processing unavailable.' }, { status: 503 });
    } else {
      return Response.json({ error: 'Webhook processing in progress.' }, { status: 503 });
    }
  } else if (eventInsertError) {
    return Response.json({ error: 'Webhook processing unavailable.' }, { status: 503 });
  }

  try {
    const clerkUserId = event.data.id;
    if (!clerkUserId) throw new Error('missing_subject');

    if (eventType === 'user.created' || eventType === 'user.updated') {
      const { data: appUser, error: userError } = await supabase
        .from('app_users')
        .upsert(
          { clerk_user_id: clerkUserId, deleted_at: null, is_disabled: false },
          { onConflict: 'clerk_user_id' },
        )
        .select('id')
        .single();
      if (userError || !appUser) throw new Error('user_sync_failed');

      const [{ error: profileError }, { error: settingsError }] = await Promise.all([
        supabase.from('user_profiles').upsert({ user_id: appUser.id }, { onConflict: 'user_id', ignoreDuplicates: true }),
        supabase.from('user_settings').upsert({ user_id: appUser.id }, { onConflict: 'user_id', ignoreDuplicates: true }),
      ]);
      if (profileError || settingsError) throw new Error('profile_sync_failed');
    } else if (eventType === 'user.deleted') {
      const { error: deleteError } = await supabase
        .from('app_users')
        .update({ deleted_at: new Date().toISOString(), is_disabled: true })
        .eq('clerk_user_id', clerkUserId);
      if (deleteError) throw new Error('user_delete_sync_failed');
    }

    await supabase
      .from('identity_webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('provider', 'clerk')
      .eq('provider_event_id', eventId);

    return Response.json({ received: true });
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 64) : 'processing_failed';
    await supabase
      .from('identity_webhook_events')
      .update({ status: 'failed', last_error_code: code })
      .eq('provider', 'clerk')
      .eq('provider_event_id', eventId);
    return Response.json({ error: 'Webhook processing failed.' }, { status: 503 });
  }
}
