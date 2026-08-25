import type { MetadataRoute } from 'next';
import { getLeaderboard } from '@/server/public-data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const result = await getLeaderboard({ limit: 100 });
  const staticRoutes = ['', '/claim', '/explore', '/leaderboard', '/trending', '/activity', '/search', '/faq', '/contact', '/privacy', '/terms', '/refunds', '/shipping'];
  return [
    ...staticRoutes.map((route) => ({
      url: `${baseUrl}${route}`,
      changeFrequency: route === '' ? 'daily' as const : 'hourly' as const,
      priority: route === '' ? 1 : 0.8,
    })),
    ...result.data.map((claim) => ({
      url: `${baseUrl}/day/${claim.isoDate}`,
      lastModified: claim.claimedAt ? new Date(claim.claimedAt) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
