import type { PublicClaim } from '@/lib/public/types';

export type AuctionFilter = 'all' | 'ending' | 'popular' | 'new';

export const auctionFilters: { value: AuctionFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'ending', label: 'Ending soon' },
  { value: 'popular', label: 'Most popular' },
  { value: 'new', label: 'New' },
];

export const auctionVisuals = [
  { variant: 'orbital', kicker: 'A future worth remembering' },
  { variant: 'signal', kicker: 'A moment in motion' },
  { variant: 'eclipse', kicker: 'A permanent public record' },
  { variant: 'grid', kicker: 'One day. One current claim.' },
] as const;

export function visualForAuction(index: number) {
  return auctionVisuals[index % auctionVisuals.length];
}

export function matchesAuctionFilter(claim: PublicClaim, filter: AuctionFilter) {
  if (filter === 'all') return true;
  if (filter === 'ending') return claim.period === 'future';
  if (filter === 'popular') return claim.rank <= 10 || claim.trendScore >= 500;
  const age = Date.now() - Date.parse(claim.claimedAt);
  return age <= 30 * 86_400_000;
}

export function trendIncrease(claim: PublicClaim) {
  return Math.max(4, Math.min(99, Math.round(claim.trendScore / Math.max(claim.amountMinor, 1) * 100)));
}
