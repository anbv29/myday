import { describe, expect, it } from 'vitest';
import { buildDateCollection, type FreeDateRegistration } from '@/lib/public/date-collection';
import { claims } from '@/lib/preview-data';
import { freeRegistrationSchema } from '@/lib/validation/registration';

const free: FreeDateRegistration = {
  id: 'free-1', isoDate: '2026-06-02', title: 'My milestone', story: 'A memorable day.',
  attribution: '@example', registeredAt: '2026-01-01T00:00:00Z',
};
const input = { date: free.isoDate, title: free.title, story: free.story, attribution: free.attribution, consent: true };

describe('submitted date collection', () => {
  it('orders actual dates chronologically, not by price or submission time', () => {
    const paid = [
      { ...claims[0], claimId: 'december', isoDate: '2026-12-22', amountMinor: 9000 },
      { ...claims[0], claimId: 'october', isoDate: '2026-10-01', amountMinor: 100 },
    ];
    expect(buildDateCollection(paid, [free]).map((entry) => entry.isoDate)).toEqual(['2026-06-02', '2026-10-01', '2026-12-22']);
  });
  it('shows only one entry for an exact date, with paid priority', () => {
    const result = buildDateCollection([{ ...claims[0], isoDate: free.isoDate }], [free]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ kind: 'featured', amount: claims[0].amount });
  });
  it('distinguishes the same day in different years', () => {
    expect(buildDateCollection([], [free, { ...free, id: 'second-year', isoDate: '2027-06-02' }])).toHaveLength(2);
  });
  it('does not create synthetic month cells or records', () => {
    expect(buildDateCollection([], [])).toEqual([]);
    expect(buildDateCollection([], [free])).toHaveLength(1);
  });
  it('labels free entries without a fabricated payment or ranking', () => {
    expect(buildDateCollection([], [free])[0]).toMatchObject({ amount: 'Free', rank: null, kind: 'free' });
  });
});

describe('free registration validation', () => {
  it('accepts a public registration without billing or payment fields', () => expect(freeRegistrationSchema.safeParse(input).success).toBe(true));
  it('requires explicit public and replaceable consent', () => expect(freeRegistrationSchema.safeParse({ ...input, consent: false }).success).toBe(false));
  it('rejects invalid calendar dates', () => expect(freeRegistrationSchema.safeParse({ ...input, date: '2026-02-30' }).success).toBe(false));
  it('rejects dates outside the supported range', () => expect(freeRegistrationSchema.safeParse({ ...input, date: '2101-01-01' }).success).toBe(false));
  it('rejects unsafe attribution URLs', () => expect(freeRegistrationSchema.safeParse({ ...input, attribution: 'javascript:alert(1)' }).success).toBe(false));
  it('rejects attempts to supply paid-state fields', () => expect(freeRegistrationSchema.safeParse({ ...input, amountMinor: 0 }).success).toBe(false));
});
