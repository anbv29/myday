export type PublicDataSource = 'supabase' | 'preview' | 'unavailable';

export type ClaimPeriod = 'future' | 'past' | 'today';

export type ClaimHistoryItem = {
  claimId: string;
  amount: string;
  amountMinor: number;
  currency: string;
  username: string | null;
  claimedAt: string;
  status: 'current' | 'superseded';
};

export type PublicClaim = {
  claimId: string;
  rank: number;
  isoDate: string;
  fullDate: string;
  shortDate: string;
  month: string;
  day: string;
  year: string;
  amount: string;
  amountMinor: number;
  currency: string;
  title: string;
  story: string;
  attribution: string | null;
  username: string | null;
  displayName: string | null;
  period: ClaimPeriod;
  distance: string;
  claimedAt: string;
  trendScore: number;
  visibility: 'public' | 'unlisted' | 'private';
  isPrivate: boolean;
};

export type PublicProfile = {
  userId: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  publicClaimCount: number;
  highestClaim: string;
  highestClaimMinor: number;
  claims: PublicClaim[];
};

export type PublicActivity = {
  eventId: number;
  eventType: 'claimed' | 'outbid';
  createdAt: string;
  isoDate: string;
  fullDate: string;
  amount: string;
  username: string;
  title: string;
  claimId: string;
};

export type PublicDateDetail = {
  claim: PublicClaim;
  history: ClaimHistoryItem[];
};

export type PublicResult<T> = {
  source: PublicDataSource;
  data: T;
  error?: string;
};
