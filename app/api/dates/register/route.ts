import { freeRegistrationSchema } from '@/lib/validation/registration';
import { hasTrustedMutationOrigin, readBoundedBody } from '@/server/http/security';
import { sha256Hex } from '@/server/payments/crypto';
import { checkCheckoutRateLimit } from '@/server/rate-limit/checkout';
import { createAdminSupabaseClient } from '@/server/supabase/admin';

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return Response.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  try {
    const ip = (request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown').split(',')[0].trim().slice(0, 64);
    const limit = await checkCheckoutRateLimit(`registration:${await sha256Hex(ip)}`);
    if (!limit.success) return Response.json({ error: limit.unavailable ? 'Registration is temporarily unavailable.' : 'Too many attempts. Please try again later.' }, {
      status: limit.unavailable ? 503 : 429,
      headers: { 'Retry-After': String(Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))) },
    });
    let body: string;
    try { body = await readBoundedBody(request, 8 * 1024); }
    catch { return Response.json({ error: 'Request is too large.' }, { status: 413 }); }
    let input: unknown;
    try { input = JSON.parse(body); }
    catch { return Response.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
    const parsed = freeRegistrationSchema.safeParse(input);
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid registration.' }, { status: 400 });
    const { data, error } = await createAdminSupabaseClient().rpc('register_free_date', {
      target_date: parsed.data.date, registration_title: parsed.data.title,
      registration_story: parsed.data.story, registration_attribution: parsed.data.attribution,
    });
    if (error) {
      if (error.message.includes('date_has_paid_claim')) return Response.json({ error: 'This date has a paid claim. Make a higher paid claim to feature your story.' }, { status: 409 });
      if (error.message.includes('date_already_registered')) return Response.json({ error: 'This date is already registered. A paid claim can replace the free registration.' }, { status: 409 });
      console.error('Free registration failed', { code: error.code });
      return Response.json({ error: 'Registration is unavailable. Please try again later.' }, { status: 503 });
    }
    if (typeof data !== 'string') throw new Error('missing_registration');
    return Response.json({ id: data, date: parsed.data.date, kind: 'free' }, {
      status: 201, headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return Response.json({ error: 'Registration is unavailable. Please try again later.' }, { status: 503 });
  }
}
