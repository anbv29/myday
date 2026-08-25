import { notificationSettingsSchema } from '@/lib/validation/account';
import { getRequestIdentity } from '@/server/auth/identity';
import { hasTrustedMutationOrigin, readBoundedBody } from '@/server/http/security';
import { checkAccountRateLimit } from '@/server/rate-limit/account';
import { createUserSupabaseClient } from '@/server/supabase/user';

export async function PATCH(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return Response.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  const identity = await getRequestIdentity(request);
  if (!identity) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  const rate = await checkAccountRateLimit(identity.clerkUserId);
  if (!rate.success) return Response.json({ error: rate.unavailable ? 'Settings are temporarily unavailable.' : 'Too many changes. Try again later.' }, { status: rate.unavailable ? 503 : 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((rate.reset - Date.now()) / 1000))) } });
  let body: string;
  try { body = await readBoundedBody(request, 1024); } catch { return Response.json({ error: 'Request is too large.' }, { status: 413 }); }
  let input: unknown;
  try { input = JSON.parse(body); } catch { return Response.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const parsed = notificationSettingsSchema.safeParse(input);
  if (!parsed.success) return Response.json({ error: 'Choose valid notification preferences.' }, { status: 400 });
  const token = await identity.getSupabaseToken();
  if (!token) return Response.json({ error: 'Authentication could not be verified.' }, { status: 401 });
  const supabase = createUserSupabaseClient(token);
  const ensured = await supabase.rpc('ensure_app_user');
  if (ensured.error) return Response.json({ error: 'Preferences could not be loaded.' }, { status: 503 });
  const { data, error } = await supabase.rpc('update_my_notification_settings', {
    new_email_claim_updates: parsed.data.emailClaimUpdates,
    new_email_outbid_alerts: parsed.data.emailOutbidAlerts,
    new_email_product_updates: parsed.data.emailProductUpdates,
  });
  if (error) return Response.json({ error: 'Notification preferences could not be saved.' }, { status: 503 });
  const row = Array.isArray(data) ? data[0] : data;
  return Response.json({
    emailClaimUpdates: Boolean(row?.saved_email_claim_updates),
    emailOutbidAlerts: Boolean(row?.saved_email_outbid_alerts),
    emailProductUpdates: Boolean(row?.saved_email_product_updates),
    updatedAt: row?.saved_updated_at,
  }, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' } });
}
