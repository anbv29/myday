import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis/cloudflare';

let accountLimiter: Ratelimit | null | undefined;

function limiter() {
  if (accountLimiter !== undefined) return accountLimiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return accountLimiter = null;
  return accountLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(20, '10 m'),
    prefix: 'myday:account',
    timeout: 1500,
    analytics: false,
  });
}

export async function checkAccountRateLimit(userId: string) {
  const rateLimiter = limiter();
  if (!rateLimiter) return process.env.NODE_ENV === 'production'
    ? { success: false, reset: Date.now() + 60_000, unavailable: true }
    : { success: true, reset: Date.now() + 600_000, unavailable: false };
  const result = await rateLimiter.limit(userId);
  return { success: result.success && result.reason !== 'timeout', reset: result.reset, unavailable: result.reason === 'timeout' };
}
