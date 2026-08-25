const USD_INR_REFERENCE_URL = 'https://api.frankfurter.dev/v2/rate/USD/INR?providers=ECB';
const MAX_RATE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_MS = 60 * 60 * 1000;

export type UsdInrReferenceRate = {
  rate: number;
  date: string;
  source: 'ECB via Frankfurter';
};

let cached: { value: UsdInrReferenceRate; expiresAt: number } | null = null;

export function parseUsdInrReferenceRate(input: unknown, now = new Date()): UsdInrReferenceRate {
  if (!input || typeof input !== 'object') throw new Error('fx_invalid_response');
  const row = input as Record<string, unknown>;
  const rate = Number(row.rate);
  const date = typeof row.date === 'string' ? row.date : '';
  const publishedAt = new Date(`${date}T00:00:00.000Z`);
  if (row.base !== 'USD' || row.quote !== 'INR' || !Number.isFinite(rate) || rate < 40 || rate > 200) {
    throw new Error('fx_invalid_response');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(publishedAt.getTime())) throw new Error('fx_invalid_date');
  const age = now.getTime() - publishedAt.getTime();
  if (age < -24 * 60 * 60 * 1000 || age > MAX_RATE_AGE_MS) throw new Error('fx_stale_rate');
  return { rate, date, source: 'ECB via Frankfurter' };
}

export async function getUsdInrReferenceRate(): Promise<UsdInrReferenceRate> {
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const response = await fetch(USD_INR_REFERENCE_URL, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(3000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`fx_provider_${response.status}`);
  const value = parseUsdInrReferenceRate(await response.json());
  cached = { value, expiresAt: Date.now() + CACHE_MS };
  return value;
}
