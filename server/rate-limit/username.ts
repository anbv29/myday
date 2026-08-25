import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis/cloudflare';

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  reason?: string;
};

let usernameLimiter: Ratelimit | null | undefined;

function getUsernameLimiter() {
  if (usernameLimiter !== undefined) return usernameLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    usernameLimiter = null;
    return usernameLimiter;
  }

  usernameLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(12, '1 m'),
    prefix: 'myday:username',
    timeout: 1500,
    analytics: false,
  });
  return usernameLimiter;
}

export async function checkUsernameRateLimit(identifier: string): Promise<RateLimitResult> {
  const limiter = getUsernameLimiter();
  if (!limiter) {
    if (process.env.NODE_ENV === 'production') {
      return { success: false, limit: 0, remaining: 0, reset: Date.now() + 60_000, reason: 'unavailable' };
    }
    return { success: true, limit: 12, remaining: 12, reset: Date.now() + 60_000, reason: 'development' };
  }

  const result = await limiter.limit(identifier);
  if (result.reason === 'timeout') {
    return { ...result, success: false };
  }
  return result;
}
