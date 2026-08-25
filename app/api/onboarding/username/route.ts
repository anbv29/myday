import { getRequestIdentity } from '@/server/auth/identity';
import { checkUsernameRateLimit } from '@/server/rate-limit/username';
import { createUserSupabaseClient } from '@/server/supabase/user';
import { usernamePayloadSchema } from '@/lib/validation/username';

const MAX_BODY_BYTES = 1024;

export async function POST(request: Request) {
  const identity = await getRequestIdentity(request);
  if (!identity) return Response.json({ error: 'Authentication required.' }, { status: 401 });

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json({ error: 'Request is too large.' }, { status: 413 });
  }

  const rateLimit = await checkUsernameRateLimit(`claim:${identity.clerkUserId}`);
  if (!rateLimit.success) {
    return Response.json(
      { error: rateLimit.reason === 'unavailable' ? 'Username changes are temporarily unavailable.' : 'Too many attempts.' },
      {
        status: rateLimit.reason === 'unavailable' ? 503 : 429,
        headers: { 'Retry-After': String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))) },
      },
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = usernamePayloadSchema.safeParse(input);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid username.' }, { status: 400 });
  }

  const token = await identity.getSupabaseToken();
  if (!token) return Response.json({ error: 'Authentication could not be verified.' }, { status: 401 });

  const supabase = createUserSupabaseClient(token);
  const { data, error } = await supabase.rpc('claim_username', { candidate: parsed.data.username });
  if (error) {
    if (error.code === '23505' || error.message.includes('username_unavailable')) {
      return Response.json({ error: 'That username is unavailable.' }, { status: 409 });
    }
    if (error.code === '22023') {
      return Response.json({ error: 'Choose a valid username.' }, { status: 400 });
    }
    return Response.json({ error: 'The username could not be saved right now.' }, { status: 503 });
  }

  const profile = Array.isArray(data) ? data[0] : data;
  return Response.json(
    { username: profile?.username ?? parsed.data.username },
    { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' } },
  );
}
