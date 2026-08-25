import { redirect } from 'next/navigation';
import { isIdentityStackConfigured } from '@/lib/env';
import { getRequestIdentity } from '@/server/auth/identity';
import { createUserSupabaseClient } from '@/server/supabase/user';

export type AccountSummary = {
  userId: string;
  username: string;
  normalizedUsername: string;
  displayName: string | null;
  bio: string | null;
  emailClaimUpdates: boolean;
  emailOutbidAlerts: boolean;
  emailProductUpdates: boolean;
  currentClaimCount: number;
  historicalClaimCount: number;
  totalClaimValueMinor: number;
  openCheckoutCount: number;
};

export async function requireAccount(returnTo: string) {
  if (!isIdentityStackConfigured()) return { state: 'unconfigured' as const };
  const identity = await getRequestIdentity();
  if (!identity) redirect(`/sign-in?redirect_url=${encodeURIComponent(returnTo)}`);
  const token = await identity.getSupabaseToken();
  if (!token) redirect(`/sign-in?redirect_url=${encodeURIComponent(returnTo)}`);
  const supabase = createUserSupabaseClient(token);
  const ensured = await supabase.rpc('ensure_app_user');
  if (ensured.error) return { state: 'unavailable' as const };
  const result = await supabase.rpc('get_my_account_summary');
  if (result.error) return { state: 'unavailable' as const };
  const row = (Array.isArray(result.data) ? result.data[0] : result.data) as Record<string, unknown> | undefined;
  if (!row || !row.onboarding_completed || !row.username) redirect('/onboarding/username');
  const summary: AccountSummary = {
    userId: String(row.user_id),
    username: String(row.username),
    normalizedUsername: String(row.normalized_username),
    displayName: typeof row.display_name === 'string' ? row.display_name : null,
    bio: typeof row.bio === 'string' ? row.bio : null,
    emailClaimUpdates: Boolean(row.email_claim_updates),
    emailOutbidAlerts: Boolean(row.email_outbid_alerts),
    emailProductUpdates: Boolean(row.email_product_updates),
    currentClaimCount: Number(row.current_claim_count),
    historicalClaimCount: Number(row.historical_claim_count),
    totalClaimValueMinor: Number(row.total_claim_value_minor),
    openCheckoutCount: Number(row.open_checkout_count),
  };
  return { state: 'ready' as const, supabase, summary };
}
