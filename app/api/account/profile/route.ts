import { profileSettingsSchema } from '@/lib/validation/account';
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
  try { body = await readBoundedBody(request, 2048); } catch { return Response.json({ error: 'Request is too large.' }, { status: 413 }); }
  let input: unknown;
  try { input = JSON.parse(body); } catch { return Response.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const parsed = profileSettingsSchema.safeParse(input);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid profile.' }, { status: 400 });
  const token = await identity.getSupabaseToken();
  if (!token) return Response.json({ error: 'Authentication could not be verified.' }, { status: 401 });
  const supabase = createUserSupabaseClient(token);
  const ensured = await supabase.rpc('ensure_app_user');
  if (ensured.error) return Response.json({ error: 'Profile could not be loaded.' }, { status: 503 });
  const { data, error } = await supabase.rpc('update_my_profile', {
    new_display_name: parsed.data.displayName,
    new_bio: parsed.data.bio,
  });
  if (error) return Response.json({ error: error.code === '22023' ? 'Profile details are invalid.' : 'Profile could not be saved.' }, { status: error.code === '22023' ? 400 : 503 });
  const row = Array.isArray(data) ? data[0] : data;
  return Response.json({ displayName: row?.saved_display_name ?? null, bio: row?.saved_bio ?? null, updatedAt: row?.saved_updated_at }, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' } });
}
