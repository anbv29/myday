import { describe, expect, it } from 'vitest';
import { claimCheckoutSchema } from '@/lib/validation/claim';
import { publicAttributionHref } from '@/lib/public/attribution';

const validClaim = {
  date: '2027-08-18',
  title: 'Launch day',
  story: 'The product finally becomes public.',
  attribution: '@founder.name',
  visibility: 'public',
  amountMinor: 125000,
  billingCountry: 'us',
  idempotencyKey: 'checkout_request_123456',
};

describe('claim checkout validation', () => {
  it('normalizes the billing country and accepts an allowlisted payload', () => {
    expect(claimCheckoutSchema.parse(validClaim)).toMatchObject({ billingCountry: 'US', attribution: '@founder.name' });
  });

  it('normalizes a complete HTTPS attribution link', () => {
    expect(claimCheckoutSchema.parse({ ...validClaim, attribution: ' https://example.com/me#profile ' }).attribution).toBe('https://example.com/me');
  });

  it('only creates outbound hrefs for validated HTTPS links', () => {
    expect(publicAttributionHref('@founder')).toBeNull();
    expect(publicAttributionHref('javascript:alert(1)')).toBeNull();
    expect(publicAttributionHref('https://example.com/me')).toBe('https://example.com/me');
  });

  it('rejects mass-assignment fields', () => {
    expect(claimCheckoutSchema.safeParse({ ...validClaim, paymentStatus: 'paid', ownerId: 'someone-else' }).success).toBe(false);
  });

  it.each([
    { field: 'date', value: '2027-02-30' },
    { field: 'visibility', value: 'followers' },
    { field: 'amountMinor', value: 0 },
    { field: 'amountMinor', value: 100_000_001 },
    { field: 'idempotencyKey', value: 'short' },
    { field: 'attribution', value: 'founder without at' },
    { field: 'attribution', value: 'http://example.com' },
    { field: 'attribution', value: 'javascript:alert(1)' },
  ])('rejects invalid $field', ({ field, value }) => {
    expect(claimCheckoutSchema.safeParse({ ...validClaim, [field]: value }).success).toBe(false);
  });
});
