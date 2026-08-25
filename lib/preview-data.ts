import type { ClaimHistoryItem, PublicActivity, PublicClaim, PublicProfile } from '@/lib/public/types';

export const claims: PublicClaim[] = [
  {
    claimId: 'preview-october-29-2026',
    rank: 1,
    isoDate: '2026-10-29',
    fullDate: 'October 29, 2026',
    shortDate: 'OCT 29, 2026',
    month: 'OCTOBER',
    day: '29',
    year: '2026',
    amount: '$10',
    amountMinor: 1000,
    currency: 'USD',
    title: 'My birthday',
    story: 'My bday.',
    attribution: '@anewbhev',
    username: '@anewbhev',
    collectorBio: 'Keeping my birthday on the MYDAY record.',
    period: 'future',
    distance: '64 DAYS TO GO',
    displayName: 'Anubhav',
    claimedAt: '2026-08-26T12:00:00.000Z',
    trendScore: 1000,
    visibility: 'public',
    isPrivate: false,
  },
];

export const previewHistory: Record<string, ClaimHistoryItem[]> = {};

export const previewProfiles: PublicProfile[] = Array.from(new Set(claims.map((claim) => claim.username)))
  .filter((username): username is string => Boolean(username))
  .map((username) => {
    const profileClaims = claims.filter((claim) => claim.username === username);
    const highest = Math.max(...profileClaims.map((claim) => claim.amountMinor));
    return {
      userId: `preview-${username.slice(1)}`,
      username,
      displayName: profileClaims[0]?.displayName ?? null,
      bio: profileClaims[0]?.collectorBio ?? null,
      avatarUrl: null,
      publicClaimCount: profileClaims.length,
      highestClaim: profileClaims.find((claim) => claim.amountMinor === highest)?.amount ?? '$0',
      highestClaimMinor: highest,
      claims: profileClaims,
    };
  });

export const previewActivity: PublicActivity[] = claims.slice(0, 4).map((claim, index) => ({
  eventId: index + 1,
  eventType: index === 3 ? 'outbid' : 'claimed',
  createdAt: claim.claimedAt,
  isoDate: claim.isoDate,
  fullDate: claim.fullDate,
  amount: claim.amount,
  username: claim.username ?? '@private',
  title: claim.title,
  claimId: claim.claimId,
}));
