import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let checkoutLimiter: Ratelimit | null | undefined;

function getCheckoutLimiter() {
  if (checkoutLimiter !== undefined) return checkoutLimiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return checkoutLimiter = null;
  return checkoutLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, '10 m'),
    prefix: 'myday:checkout',
    timeout: 1500,
    analytics: false,
  });
}

export async function checkCheckoutRateLimit(userId: string) {
  const limiter = getCheckoutLimiter();
  if (!limiter) {
    return process.env.NODE_ENV === 'production'
      ? { success: false, reset: Date.now() + 60_000, unavailable: true }
      : { success: true, reset: Date.now() + 600_000, unavailable: false };
  }
  const result = await limiter.limit(userId);
  return { success: result.success && result.reason !== 'timeout', reset: result.reset, unavailable: result.reason === 'timeout' };
}
