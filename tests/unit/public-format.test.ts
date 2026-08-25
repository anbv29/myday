import { describe, expect, it } from 'vitest';
import { formatMoney, formatPublicDate, formatPublicUsername, getDateContext, isIsoCalendarDate } from '@/lib/public/format';

describe('public claim formatting', () => {
  it('formats minor currency units without losing cents', () => {
    expect(formatMoney(125000, 'USD')).toBe('$1,250');
    expect(formatMoney(12345, 'USD')).toBe('$123.45');
  });

  it('formats dates in UTC so server output is timezone-stable', () => {
    expect(formatPublicDate('2028-02-14')).toMatchObject({
      fullDate: 'February 14, 2028', month: 'FEBRUARY', day: '14', year: '2028',
    });
  });

  it.each(['2027-08-18', '2000-02-29'])('accepts valid ISO calendar date %s', (date) => {
    expect(isIsoCalendarDate(date)).toBe(true);
  });

  it.each(['2027-02-29', '2027-13-01', '18-08-2027', ''])('rejects invalid calendar date %s', (date) => {
    expect(isIsoCalendarDate(date)).toBe(false);
  });

  it('calculates past, present, and future context against a stable reference date', () => {
    const today = new Date('2026-08-25T18:00:00.000Z');
    expect(getDateContext('2026-08-25', today)).toEqual({ period: 'today', distance: 'TODAY' });
    expect(getDateContext('2026-08-26', today)).toEqual({ period: 'future', distance: '1 DAY TO GO' });
    expect(getDateContext('2026-08-24', today)).toEqual({ period: 'past', distance: '1 DAY AGO' });
  });

  it('adds exactly one public handle marker', () => {
    expect(formatPublicUsername('founder')).toBe('@founder');
    expect(formatPublicUsername('@founder')).toBe('@founder');
    expect(formatPublicUsername(null)).toBeNull();
  });
});
