import { describe, expect, it } from 'vitest';
import { parseUsdInrReferenceRate } from '@/server/payments/fx';

describe('USD/INR reference-rate validation', () => {
  const now = new Date('2026-08-25T12:00:00.000Z');

  it('accepts a recent bounded ECB rate', () => {
    expect(parseUsdInrReferenceRate({ date: '2026-08-25', base: 'USD', quote: 'INR', rate: 95.754 }, now))
      .toEqual({ date: '2026-08-25', rate: 95.754, source: 'ECB via Frankfurter' });
  });

  it.each([
    { date: '2026-08-01', base: 'USD', quote: 'INR', rate: 95.754 },
    { date: '2026-08-25', base: 'EUR', quote: 'INR', rate: 95.754 },
    { date: '2026-08-25', base: 'USD', quote: 'INR', rate: 4 },
  ])('rejects stale, mismatched, or implausible rates', (payload) => {
    expect(() => parseUsdInrReferenceRate(payload, now)).toThrow();
  });
});
