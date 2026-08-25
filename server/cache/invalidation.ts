import { Redis } from '@upstash/redis/cloudflare';

export async function invalidatePublicClaimCache() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  try {
    await new Redis({ url, token }).incr('myday:public:cache-version');
  } catch (error) {
    console.error('Public cache invalidation failed', error);
  }
}
