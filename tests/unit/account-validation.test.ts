import { describe, expect, it } from 'vitest';
import { notificationSettingsSchema, profileSettingsSchema } from '@/lib/validation/account';
import { accountCheckoutHref } from '@/server/account/data';

describe('account settings validation', () => {
  it('trims valid profile fields', () => {
    expect(profileSettingsSchema.parse({ displayName: '  Ada Lovelace  ', bio: '  Collector of meaningful days.  ' })).toEqual({
      displayName: 'Ada Lovelace',
      bio: 'Collector of meaningful days.',
    });
  });

  it('allows profile fields to be cleared', () => {
    expect(profileSettingsSchema.parse({ displayName: ' ', bio: '' })).toEqual({ displayName: '', bio: '' });
  });

  it('rejects oversized profile fields', () => {
    expect(profileSettingsSchema.safeParse({ displayName: 'x'.repeat(61), bio: '' }).success).toBe(false);
    expect(profileSettingsSchema.safeParse({ displayName: '', bio: 'x'.repeat(281) }).success).toBe(false);
  });

  it('rejects profile mass assignment', () => {
    expect(profileSettingsSchema.safeParse({ displayName: 'Ada', bio: '', userId: 'someone-else' }).success).toBe(false);
  });

  it('accepts a complete notification preference set', () => {
    expect(notificationSettingsSchema.parse({ emailClaimUpdates: true, emailOutbidAlerts: false, emailProductUpdates: false })).toEqual({
      emailClaimUpdates: true,
      emailOutbidAlerts: false,
      emailProductUpdates: false,
    });
  });

  it('rejects missing or non-boolean notification values', () => {
    expect(notificationSettingsSchema.safeParse({ emailClaimUpdates: true, emailOutbidAlerts: false }).success).toBe(false);
    expect(notificationSettingsSchema.safeParse({ emailClaimUpdates: 'yes', emailOutbidAlerts: false, emailProductUpdates: false }).success).toBe(false);
  });

  it('rejects notification mass assignment', () => {
    expect(notificationSettingsSchema.safeParse({ emailClaimUpdates: true, emailOutbidAlerts: true, emailProductUpdates: true, email: 'attacker@example.com' }).success).toBe(false);
  });

  it('routes completed checkout activity to the owned date', () => {
    expect(accountCheckoutHref({ status: 'completed', date: '2027-08-18', intentId: 'intent-1' })).toBe('/day/2027-08-18');
  });

  it('routes unsettled checkout activity to verified status', () => {
    expect(accountCheckoutHref({ status: 'refund_pending', date: '2027-08-18', intentId: 'intent with space' })).toBe('/payment/status?intent=intent%20with%20space');
  });

  it('does not offer an action for a final failed checkout', () => {
    expect(accountCheckoutHref({ status: 'failed', date: '2027-08-18', intentId: 'intent-1' })).toBeNull();
  });
});
