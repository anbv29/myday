import { afterEach, describe, expect, it } from 'vitest';
import { hasTrustedMutationOrigin, readBoundedBody } from '@/server/http/security';

afterEach(() => { delete process.env.NEXT_PUBLIC_APP_URL; });

describe('mutation request protections', () => {
  it('accepts the configured origin and rejects a cross-site origin', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://myday.lol';
    expect(hasTrustedMutationOrigin(new Request('https://myday.lol/api', { headers: { Origin: 'https://myday.lol' } }))).toBe(true);
    expect(hasTrustedMutationOrigin(new Request('https://myday.lol/api', { headers: { Origin: 'https://attacker.example' } }))).toBe(false);
  });

  it('enforces the body limit even when content-length is missing', async () => {
    await expect(readBoundedBody(new Request('https://myday.lol/api', { method: 'POST', body: '12345' }), 4)).rejects.toThrow('body_too_large');
  });
});
