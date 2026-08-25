import { getRequestIdentity } from '@/server/auth/identity';
import { checkUsernameRateLimit } from '@/server/rate-limit/username';
import { createUserSupabaseClient } from '@/server/supabase/user';
import { usernameSchema } from '@/lib/validation/username';

type UsernameRouteProps = { params: Promise<{ username: string }> };

export async function GET(request: Request, { params }: UsernameRouteProps) {
  const identity = await getRequestIdentity(request);
  if (!identity) return Response.json({ error: 'Authentication required.' }, { status: 401 });

  const rateLimit = await checkUsernameRateLimit(`availability:${identity.clerkUserId}`);
  if (!rateLimit.success) {
    return Response.json(
      { error: rateLimit.reason === 'unavailable' ? 'Availability checks are temporarily unavailable.' : 'Too many checks.' },
      {
        status: rateLimit.reason === 'unavailable' ? 503 : 429,
        headers: { 'Retry-After': String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))) },
      },
    );
  }

  const { username } = await params;
  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) {
    return Response.json({ available: false }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }

  const token = await identity.getSupabaseToken();
  if (!token) return Response.json({ error: 'Authentication could not be verified.' }, { status: 401 });

  const supabase = createUserSupabaseClient(token);
  const { data, error } = await supabase.rpc('is_username_available', { candidate: parsed.data });
  if (error) {
    return Response.json({ error: 'Availability checks are temporarily unavailable.' }, { status: 503 });
  }

  return Response.json(
    { available: data === true },
    { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' } },
  );
}
