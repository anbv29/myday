import { afterEach, describe, expect, it, vi } from 'vitest';
import { isEnvValuePresent, isProductionConfigurationComplete } from '@/lib/env';

describe('environment safety', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('rejects empty and placeholder values', () => {
    expect(isEnvValuePresent(undefined)).toBe(false);
    expect(isEnvValuePresent('')).toBe(false);
    expect(isEnvValuePresent('https://replace-me.example')).toBe(false);
    expect(isEnvValuePresent('replace_me')).toBe(false);
    expect(isEnvValuePresent('real-value')).toBe(true);
  });

  it('requires the core stack and Razorpay', () => {
    const required = {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_real',
      CLERK_SECRET_KEY: 'sk_test_real',
      CLERK_WEBHOOK_SIGNING_SECRET: 'whsec_real',
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_real',
      SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_real',
      UPSTASH_REDIS_REST_URL: 'https://redis.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'redis-real',
      RAZORPAY_KEY_ID: 'rzp_test_real',
      RAZORPAY_KEY_SECRET: 'razor-secret-real',
      RAZORPAY_WEBHOOK_SECRET: 'razor-webhook-real',
    };
    Object.entries(required).forEach(([name, value]) => vi.stubEnv(name, value));
    expect(isProductionConfigurationComplete()).toBe(true);
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', 'replace_me');
    expect(isProductionConfigurationComplete()).toBe(false);
  });
});
