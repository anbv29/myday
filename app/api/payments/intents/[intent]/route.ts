import { createAdminSupabaseClient } from '@/server/supabase/admin';

type Props = { params: Promise<{ intent: string }> };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const accessPattern = /^[A-Za-z0-9_-]{16,100}$/;

export async function GET(request: Request, { params }: Props) {
  const { intent } = await params;
  const access = new URL(request.url).searchParams.get('access') ?? '';
  if (!uuidPattern.test(intent) || !accessPattern.test(access)) {
    return Response.json({ error: 'Payment status not found.' }, { status: 404 });
  }

  const { data, error } = await createAdminSupabaseClient().rpc('get_anonymous_claim_intent', {
    target_intent_id: intent,
    request_access_key: access,
  });
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
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
