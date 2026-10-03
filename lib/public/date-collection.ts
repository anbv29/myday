import type { PublicClaim } from '@/lib/public/types';

export type FreeDateRegistration = {
  id: string;
  isoDate: string;
  title: string;
  story: string;
  attribution: string;
  registeredAt: string;
};

export type DateCollectionEntry = {
  id: string;
  isoDate: string;
  title: string;
  story: string;
  attribution: string | null;
  kind: 'featured' | 'free';
  amount: string;
  rank: number | null;
  registeredAt?: string;
};

export function buildDateCollection(paid: PublicClaim[], free: FreeDateRegistration[]): DateCollectionEntry[] {
  const dates = new Map<string, DateCollectionEntry>();
  for (const entry of free) {
    if (!dates.has(entry.isoDate)) dates.set(entry.isoDate, {
      ...entry, kind: 'free', amount: 'Free', rank: null,
    });
  }
  for (const claim of paid) dates.set(claim.isoDate, {
    id: claim.claimId, isoDate: claim.isoDate, title: claim.title,
    story: claim.story, attribution: claim.attribution ?? claim.username,
    kind: 'featured', amount: claim.amount, rank: claim.rank,
  });
  return [...dates.values()].sort((a, b) => a.isoDate.localeCompare(b.isoDate));
}
