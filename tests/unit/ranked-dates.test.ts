import { describe, expect, it } from 'vitest';
import { claims } from '@/lib/preview-data';
import { getTopFeaturedDates } from '@/lib/public/ranked-dates';

describe('homepage featured date ranking', () => {
  it('uses backend price rank, not chronological order or display currency amounts', () => {
    const input = [
      { ...claims[0], rank: 2, isoDate: '2026-01-01', amountMinor: 80000, currency: 'INR' },
      { ...claims[0], rank: 1, isoDate: '2027-12-31', amountMinor: 2000, currency: 'USD' },
    ];
    expect(getTopFeaturedDates(input).map((claim) => claim.isoDate)).toEqual(['2027-12-31', '2026-01-01']);
    expect(input[0].rank).toBe(2);
  });

  it('always caps the board at the highest 30, even if more records are supplied', () => {
    const input = Array.from({ length: 40 }, (_, index) => ({ ...claims[0], claimId: `test-${index}`, rank: 40 - index }));
    expect(getTopFeaturedDates(input).map((claim) => claim.rank)).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
  });

  it('does not pad the board with invented dates', () => {
    expect(getTopFeaturedDates([])).toEqual([]);
    expect(getTopFeaturedDates(claims)).toHaveLength(claims.length);
  });

  it('retains exact dates and years without consulting the current month', () => {
    const input = [
      { ...claims[0], claimId: 'next-year', rank: 1, isoDate: '2027-06-02' },
      { ...claims[0], claimId: 'this-year', rank: 2, isoDate: '2026-06-02' },
    ];
    expect(getTopFeaturedDates(input).map((claim) => claim.isoDate)).toEqual(['2027-06-02', '2026-06-02']);
  });
});
