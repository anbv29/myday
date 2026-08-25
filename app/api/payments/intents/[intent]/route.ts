import { getRequestIdentity } from '@/server/auth/identity';
import { createUserSupabaseClient } from '@/server/supabase/user';

type Props = { params: Promise<{ intent: string }> };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: Props) {
  const identity = await getRequestIdentity(request);
  if (!identity) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  const { intent } = await params;
  if (!uuidPattern.test(intent)) return Response.json({ error: 'Payment status not found.' }, { status: 404 });
  const token = await identity.getSupabaseToken();
  if (!token) return Response.json({ error: 'Authentication could not be verified.' }, { status: 401 });
  const { data, error } = await createUserSupabaseClient(token).rpc('get_my_claim_intent', { target_intent_id: intent });
  if (error) return Response.json({ error: 'Payment status is temporarily unavailable.' }, { status: 503 });
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  if (!row) return Response.json({ error: 'Payment status not found.' }, { status: 404 });
  return Response.json({
    intentId: row.checkout_intent_id,
    date: row.date_value,
    title: row.title,
    amountMinor: Number(row.amount_minor),
    currency: row.currency,
    status: row.claim_status,
    failureCode: row.failure_code,
    expiresAt: row.expires_at,
    updatedAt: row.updated_at,
  }, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' } });
}
