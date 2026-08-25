import { describe, expect, it } from 'vitest';
import { usernamePayloadSchema, usernameSchema } from '@/lib/validation/username';

describe('username validation', () => {
  it.each(['vishu', 'VISHU', 'day_one', '2027launch'])('accepts %s', (username) => {
    expect(usernameSchema.safeParse(username).success).toBe(true);
  });

  it.each(['ab', 'a-b', '@vishu', 'has space', 'x'.repeat(21)])('rejects %s', (username) => {
    expect(usernameSchema.safeParse(username).success).toBe(false);
  });

  it('trims the submitted username', () => {
    expect(usernameSchema.parse('  founder  ')).toBe('founder');
  });

  it('rejects mass-assignment fields', () => {
    const result = usernamePayloadSchema.safeParse({ username: 'founder', role: 'admin' });
    expect(result.success).toBe(false);
  });
});
