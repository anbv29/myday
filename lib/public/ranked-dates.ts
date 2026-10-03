import type { PublicClaim } from '@/lib/public/types';

export const FEATURED_DATE_LIMIT = 30;

export function getTopFeaturedDates(claims: readonly PublicClaim[]) {
  // The backend rank uses canonical value. Display amounts can be in different
  // currencies, so comparing amountMinor here would produce the wrong order.
  return [...claims].sort((a, b) => a.rank - b.rank).slice(0, FEATURED_DATE_LIMIT);
}
