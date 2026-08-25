import { formatMoney, formatPublicDate } from '@/lib/public/format';
import type { createUserSupabaseClient } from '@/server/supabase/user';

type UserSupabaseClient = ReturnType<typeof createUserSupabaseClient>;
type Row = Record<string, unknown>;

export type AccountClaim = {
  claimId: string;
  date: string;
  fullDate: string;
  shortDate: string;
  title: string;
  story: string;
  attribution: string;
  visibility: string;
  status: string;
  amount: string;
  claimedAt: string;
  supersededAt: string | null;
  isCurrent: boolean;
};

export type AccountCheckout = {
  intentId: string;
  date: string;
  fullDate: string;
  title: string;
  amount: string;
  status: string;
  failureCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export function accountCheckoutHref(checkout: Pick<AccountCheckout, 'status' | 'date' | 'intentId'>) {
  if (checkout.status === 'completed') return `/day/${checkout.date}`;
  if (['refunded', 'failed', 'expired'].includes(checkout.status)) return null;
  return `/payment/status?intent=${encodeURIComponent(checkout.intentId)}`;
}

export async function getAccountClaims(client: UserSupabaseClient, limit = 50) {
  const { data, error } = await client.rpc('get_my_claims', { result_limit: limit });
  if (error) return { data: [] as AccountClaim[], error: true };
  return {
    error: false,
    data: ((data ?? []) as Row[]).map((row) => {
      const date = String(row.date_value);
      return {
        claimId: String(row.claim_id),
        date,
        ...formatPublicDate(date),
        title: String(row.title),
        story: String(row.story),
        attribution: String(row.attribution),
        visibility: String(row.visibility),
        status: String(row.claim_status),
        amount: formatMoney(Number(row.display_amount_minor), String(row.display_currency)),
        claimedAt: String(row.claimed_at),
        supersededAt: typeof row.superseded_at === 'string' ? row.superseded_at : null,
        isCurrent: Boolean(row.is_current),
      };
    }),
  };
}

export async function getAccountCheckouts(client: UserSupabaseClient, limit = 25) {
  const { data, error } = await client.rpc('get_my_checkout_activity', { result_limit: limit });
  if (error) return { data: [] as AccountCheckout[], error: true };
  return {
    error: false,
    data: ((data ?? []) as Row[]).map((row) => {
      const date = String(row.date_value);
      return {
        intentId: String(row.checkout_intent_id),
        date,
        fullDate: formatPublicDate(date).fullDate,
        title: String(row.title),
        amount: formatMoney(Number(row.amount_minor), String(row.currency)),
        status: String(row.checkout_status),
        failureCode: typeof row.failure_code === 'string' ? row.failure_code : null,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      };
    }),
  };
}
