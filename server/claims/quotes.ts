import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/env';
import { claims } from '@/lib/preview-data';
import { formatMoney, formatPublicUsername } from '@/lib/public/format';
import type { PublicDataSource } from '@/lib/public/types';

type Row = Record<string, unknown>;

export type ClaimQuote = {
  date: string;
  currentClaimId: string | null;
  currentAmountMinor: number | null;
  currentAmount: string | null;
  minimumAmountMinor: number;
  minimumAmount: string;
  currentUsername: string | null;
  dateVersion: number;
  expiresAt: string;
};

export async function getClaimQuote(date: string): Promise<{ source: PublicDataSource; quote: ClaimQuote | null }> {
  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === 'production' || process.env.MYDAY_ENABLE_PREVIEW_DATA === 'false') return { source: 'unavailable', quote: null };
    const current = claims.find((claim) => claim.isoDate === date);
    const currentAmountMinor = current?.amountMinor ?? null;
    const minimumAmountMinor = currentAmountMinor === null
      ? 2000
      : currentAmountMinor + Math.max(1000, Math.ceil(currentAmountMinor * 0.1));
    return {
      source: 'preview',
      quote: {
        date,
        currentClaimId: current?.claimId ?? null,
        currentAmountMinor,
        currentAmount: current?.amount ?? null,
        minimumAmountMinor,
        minimumAmount: formatMoney(minimumAmountMinor),
        currentUsername: current?.username ?? null,
        dateVersion: current ? 1 : 0,
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      },
    };
  }
  try {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    );
    const { data, error } = await client.rpc('get_claim_quote', { target_date: date });
    if (error) throw error;
    const row = (data as Row[] | null)?.[0];
    if (!row) return { source: 'supabase', quote: null };
    const currentAmountMinor = row.current_amount_minor === null ? null : Number(row.current_amount_minor);
    const minimumAmountMinor = Number(row.minimum_amount_minor);
    return {
      source: 'supabase',
      quote: {
        date: String(row.date_value),
        currentClaimId: row.current_claim_id ? String(row.current_claim_id) : null,
        currentAmountMinor,
        currentAmount: currentAmountMinor === null ? null : formatMoney(currentAmountMinor),
        minimumAmountMinor,
        minimumAmount: formatMoney(minimumAmountMinor),
        currentUsername: formatPublicUsername(typeof row.current_username === 'string' ? row.current_username : null),
        dateVersion: Number(row.date_version),
        expiresAt: String(row.expires_at),
      },
    };
  } catch (error) {
    console.error('Unable to load authoritative claim quote', error);
    return { source: 'unavailable', quote: null };
  }
}
