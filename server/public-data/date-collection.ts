import { isSupabaseConfigured } from '@/lib/env';
import { buildDateCollection, type DateCollectionEntry, type FreeDateRegistration } from '@/lib/public/date-collection';
import type { PublicResult } from '@/lib/public/types';
import { createAdminSupabaseClient } from '@/server/supabase/admin';
import { getLeaderboard, mapClaim, publicClient } from '@/server/public-data';

export async function getDateCollection(): Promise<PublicResult<DateCollectionEntry[]>> {
  if (!isSupabaseConfigured()) {
    const paid = await getLeaderboard({ limit: 100 });
    return { ...paid, data: buildDateCollection(paid.data, []) };
  }
  try {
    // Read paid records by date, not the top-N leaderboard. Free entries are separate.
    const [paid, free] = await Promise.all([
      publicClient().from('public_claims').select('*').order('date_value').limit(300),
      Promise.resolve().then(() => createAdminSupabaseClient()
        .from('visible_free_date_registrations').select('*').order('date_value').limit(300))
        .catch(() => ({ data: null, error: { message: 'free_registration_unavailable' } })),
    ]);
    if (paid.error) throw paid.error;
    const registrations: FreeDateRegistration[] = free.error ? [] : (free.data ?? []).map((row) => ({
      id: String(row.id), isoDate: String(row.date_value), title: String(row.title),
      story: String(row.story), attribution: String(row.attribution), registeredAt: String(row.registered_at),
    }));
    // Before the additive migration runs, paid discovery remains functional.
    return {
      source: 'supabase', data: buildDateCollection((paid.data ?? []).map(mapClaim), registrations),
      error: free.error ? 'Free registrations are temporarily unavailable. Paid dates are still shown.' : undefined,
    };
  } catch {
    return { source: 'unavailable', data: [], error: 'Date records are temporarily unavailable.' };
  }
}
