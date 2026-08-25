import { describe, expect, it } from 'vitest';
import { claimCheckoutSchema } from '@/lib/validation/claim';

const validClaim = {
  date: '2027-08-18',
  title: 'Launch day',
  story: 'The product finally becomes public.',
  visibility: 'public',
  amountMinor: 125000,
  billingCountry: 'us',
  idempotencyKey: 'checkout_request_123456',
};

describe('claim checkout validation', () => {
  it('normalizes the billing country and accepts an allowlisted payload', () => {
    expect(claimCheckoutSchema.parse(validClaim).billingCountry).toBe('US');
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
  ])('rejects invalid $field', ({ field, value }) => {
    expect(claimCheckoutSchema.safeParse({ ...validClaim, [field]: value }).success).toBe(false);
  });
});
