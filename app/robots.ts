import type { MetadataRoute } from 'next';
import { getAppOrigin } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getAppOrigin();
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/account/', '/api/', '/maintenance', '/onboarding/', '/payment/'] }],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
