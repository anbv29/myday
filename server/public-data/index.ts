import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/env';
import { claims, previewActivity, previewHistory, previewProfiles } from '@/lib/preview-data';
import { formatMoney, formatPublicDate, formatPublicUsername, getDateContext } from '@/lib/public/format';
import type {
  ClaimHistoryItem,
  PublicActivity,
  PublicClaim,
  PublicDateDetail,
  PublicProfile,
  PublicResult,
} from '@/lib/public/types';

type Row = Record<string, unknown>;
export type LeaderboardRange = 'all' | 'week' | 'month' | 'recent';
export type DateScope = 'all' | 'future' | 'past';

const previewEnabled = process.env.NODE_ENV !== 'production'
  && process.env.MYDAY_ENABLE_PREVIEW_DATA !== 'false';

function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function usernameLabel(value: unknown) {
  return formatPublicUsername(stringValue(value) || null);
}

function mapClaim(row: Row): PublicClaim {
  const isoDate = stringValue(row.date_value);
  const amountMinor = numberValue(row.display_amount_minor);
  const currency = stringValue(row.display_currency, 'USD');
  const visibility = stringValue(row.visibility, 'public') as PublicClaim['visibility'];
  const isPrivate = Boolean(row.is_private) || visibility === 'private';
  return {
    claimId: stringValue(row.claim_id),
    rank: numberValue(row.leaderboard_rank),
    isoDate,
    ...formatPublicDate(isoDate),
    amount: formatMoney(amountMinor, currency),
    amountMinor,
    currency,
    title: isPrivate ? 'A private date' : stringValue(row.title, 'A day worth remembering'),
    story: isPrivate ? 'This claim is private.' : stringValue(row.story),
    username: isPrivate ? null : usernameLabel(row.username),
    displayName: isPrivate ? null : stringValue(row.display_name) || null,
    ...getDateContext(isoDate),
    claimedAt: stringValue(row.claimed_at),
    trendScore: numberValue(row.trend_score),
    visibility,
    isPrivate,
  };
}

function unavailable<T>(data: T, message = 'Public data is temporarily unavailable.'): PublicResult<T> {
  return { source: 'unavailable', data, error: message };
}

function preview<T>(data: T): PublicResult<T> {
  return { source: 'preview', data };
}

function withinRange(claim: PublicClaim, range: LeaderboardRange) {
  if (range === 'all') return true;
  const age = Date.now() - new Date(claim.claimedAt).getTime();
  const days = age / 86_400_000;
  if (range === 'week') return days <= 7;
  if (range === 'month') return days <= 31;
  return true;
}

function inScope(claim: PublicClaim, scope: DateScope) {
  return scope === 'all' || claim.period === scope;
}

export async function getLeaderboard(options: {
  range?: LeaderboardRange;
  scope?: DateScope;
  limit?: number;
} = {}): Promise<PublicResult<PublicClaim[]>> {
  const range = options.range ?? 'all';
  const scope = options.scope ?? 'all';
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);

  if (!isSupabaseConfigured()) {
    if (!previewEnabled) return unavailable([]);
    const sorted = [...claims]
      .filter((claim) => withinRange(claim, range) && inScope(claim, scope))
      .sort((a, b) => range === 'recent'
        ? Date.parse(b.claimedAt) - Date.parse(a.claimedAt)
        : b.amountMinor - a.amountMinor)
      .slice(0, limit)
      .map((claim, index) => ({ ...claim, rank: index + 1 }));
    return preview(sorted);
  }

  try {
    let query = publicClient().from('public_claims').select('*');
    const now = new Date();
    if (scope === 'future') query = query.gte('date_value', now.toISOString().slice(0, 10));
    if (scope === 'past') query = query.lt('date_value', now.toISOString().slice(0, 10));
    if (range === 'week' || range === 'month') {
      const since = new Date(now.getTime() - (range === 'week' ? 7 : 31) * 86_400_000);
      query = query.gte('claimed_at', since.toISOString());
    }
    query = range === 'recent'
      ? query.order('claimed_at', { ascending: false })
      : query.order('canonical_amount_minor', { ascending: false });
    const { data, error } = await query.limit(limit);
    if (error) throw error;
    return { source: 'supabase', data: (data as Row[]).map(mapClaim) };
  } catch (error) {
    console.error('Unable to load public leaderboard', error);
    return unavailable([]);
  }
}

export async function getTrending(limit = 24): Promise<PublicResult<PublicClaim[]>> {
  if (!isSupabaseConfigured()) {
    if (!previewEnabled) return unavailable([]);
    return preview([...claims].sort((a, b) => b.trendScore - a.trendScore).slice(0, limit));
  }
  try {
    const { data, error } = await publicClient()
      .from('public_claims').select('*').order('trend_score', { ascending: false }).limit(limit);
    if (error) throw error;
    return { source: 'supabase', data: (data as Row[]).map(mapClaim) };
  } catch (error) {
    console.error('Unable to load trending claims', error);
    return unavailable([]);
  }
}

export async function getRecentActivity(limit = 50): Promise<PublicResult<PublicActivity[]>> {
  if (!isSupabaseConfigured()) return previewEnabled ? preview(previewActivity.slice(0, limit)) : unavailable([]);
  try {
    const { data, error } = await publicClient()
      .from('public_activity').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return {
      source: 'supabase',
      data: (data as Row[]).map((row) => ({
        eventId: numberValue(row.event_id),
        eventType: stringValue(row.event_type) as PublicActivity['eventType'],
        createdAt: stringValue(row.created_at),
        isoDate: stringValue(row.date_value),
        fullDate: formatPublicDate(stringValue(row.date_value)).fullDate,
        amount: formatMoney(numberValue(row.amount_minor), stringValue(row.currency, 'USD')),
        username: usernameLabel(row.username) ?? '@private',
        title: stringValue(row.title),
        claimId: stringValue(row.claim_id),
      })),
    };
  } catch (error) {
    console.error('Unable to load public activity', error);
    return unavailable([]);
  }
}

export async function searchPublicClaims(query: string, limit = 24): Promise<PublicResult<PublicClaim[]>> {
  const normalized = query.trim().slice(0, 100);
  if (normalized.length < 2) return { source: isSupabaseConfigured() ? 'supabase' : previewEnabled ? 'preview' : 'unavailable', data: [] };
  if (!isSupabaseConfigured()) {
    if (!previewEnabled) return unavailable([]);
    const needle = normalized.toLowerCase().replace(/^@/, '');
    return preview(claims.filter((claim) => [claim.title, claim.story, claim.isoDate, claim.username ?? '']
      .some((value) => value.toLowerCase().replace(/^@/, '').includes(needle))).slice(0, limit));
  }
  try {
    const { data, error } = await publicClient().rpc('search_public_claims', {
      search_query: normalized,
      result_limit: Math.min(limit, 50),
    });
    if (error) throw error;
    return { source: 'supabase', data: (data as Row[]).map(mapClaim) };
  } catch (error) {
    console.error('Unable to search public claims', error);
    return unavailable([]);
  }
}

export async function getPublicDate(isoDate: string): Promise<PublicResult<PublicDateDetail | null>> {
  if (!isSupabaseConfigured()) {
    if (!previewEnabled) return unavailable(null);
    const claim = claims.find((item) => item.isoDate === isoDate);
    return preview(claim ? { claim, history: previewHistory[isoDate] ?? [] } : null);
  }
  try {
    const client = publicClient();
    const [claimResult, historyResult] = await Promise.all([
      client.rpc('get_public_date_claim', { target_date: isoDate }),
      client.rpc('get_public_date_history', { target_date: isoDate, result_limit: 50 }),
    ]);
    if (claimResult.error) throw claimResult.error;
    if (historyResult.error) throw historyResult.error;
    const claimRow = (claimResult.data as Row[] | null)?.[0];
    if (!claimRow) return { source: 'supabase', data: null };
    const history: ClaimHistoryItem[] = ((historyResult.data ?? []) as Row[]).map((row) => {
      const amountMinor = numberValue(row.amount_minor);
      const currency = stringValue(row.currency, 'USD');
      return {
        claimId: stringValue(row.claim_id),
        amount: formatMoney(amountMinor, currency),
        amountMinor,
        currency,
        username: usernameLabel(row.username),
        claimedAt: stringValue(row.claimed_at),
        status: stringValue(row.status) as ClaimHistoryItem['status'],
      };
    });
    return { source: 'supabase', data: { claim: mapClaim(claimRow), history } };
  } catch (error) {
    console.error('Unable to load public date', error);
    return unavailable(null);
  }
}

export async function getPublicProfile(handle: string): Promise<PublicResult<PublicProfile | null>> {
  const normalized = handle.replace(/^@/, '').trim().toLowerCase();
  if (!isSupabaseConfigured()) {
    if (!previewEnabled) return unavailable(null);
    return preview(previewProfiles.find((profile) => profile.username.slice(1).toLowerCase() === normalized) ?? null);
  }
  try {
    const client = publicClient();
    const { data, error } = await client.from('public_profiles').select('*')
      .eq('normalized_username', normalized).maybeSingle();
    if (error) throw error;
    if (!data) return { source: 'supabase', data: null };
    const row = data as Row;
    const claimsResult = await client.from('public_claims').select('*')
      .eq('claimant_user_id', row.user_id).order('claimed_at', { ascending: false });
    if (claimsResult.error) throw claimsResult.error;
    const highestClaimMinor = numberValue(row.highest_claim_minor);
    return {
      source: 'supabase',
      data: {
        userId: stringValue(row.user_id),
        username: usernameLabel(row.username) ?? `@${normalized}`,
        displayName: stringValue(row.display_name) || null,
        bio: stringValue(row.bio) || null,
        avatarUrl: stringValue(row.avatar_url) || null,
        publicClaimCount: numberValue(row.public_claim_count),
        highestClaim: formatMoney(highestClaimMinor),
        highestClaimMinor,
        claims: ((claimsResult.data ?? []) as Row[]).map(mapClaim),
      },
    };
  } catch (error) {
    console.error('Unable to load public profile', error);
    return unavailable(null);
  }
}
