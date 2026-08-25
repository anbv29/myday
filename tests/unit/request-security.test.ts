import { afterEach, describe, expect, it } from 'vitest';
import { getAppOrigin } from '@/lib/env';
import { hasTrustedMutationOrigin, readBoundedBody } from '@/server/http/security';

afterEach(() => {
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  delete process.env.VERCEL_URL;
});

describe('mutation request protections', () => {
  it('accepts the configured origin and rejects a cross-site origin', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://myday.example';
    expect(hasTrustedMutationOrigin(new Request('https://myday.example/api', { headers: { Origin: 'https://myday.example' } }))).toBe(true);
    expect(hasTrustedMutationOrigin(new Request('https://myday.example/api', { headers: { Origin: 'https://attacker.example' } }))).toBe(false);
  });

  it('falls back safely when Vercel supplies a blank app URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = '   ';
    expect(getAppOrigin()).toBe('http://localhost:3000');
    expect(hasTrustedMutationOrigin(new Request('http://localhost:3000/api', { headers: { Origin: 'http://localhost:3000' } }))).toBe(true);
  });

  it('enforces the body limit even when content-length is missing', async () => {
    await expect(readBoundedBody(new Request('https://myday.example/api', { method: 'POST', body: '12345' }), 4)).rejects.toThrow('body_too_large');
  });
});
