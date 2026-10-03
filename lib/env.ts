export const isEnvValuePresent = (value: string | undefined) => Boolean(
  value
  && value.trim()
  && !/replace[-_]?me/i.test(value)
  && !/^your[-_]/i.test(value),
);

function urlOrigin(value: string, defaultProtocol = false) {
  const normalized = defaultProtocol && !/^https?:\/\//i.test(value)
    ? `https://${value}`
    : value;
  return new URL(normalized).origin;
}

export function getAppOrigin() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredUrl) return urlOrigin(configuredUrl);

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
    || process.env.VERCEL_URL?.trim();
  if (vercelUrl) return urlOrigin(vercelUrl, true);

  return 'http://localhost:3000';
}

export function isSupabaseConfigured() {
  return isEnvValuePresent(process.env.NEXT_PUBLIC_SUPABASE_URL)
    && isEnvValuePresent(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function isProductionConfigurationComplete() {
  const data = isSupabaseConfigured()
    && isEnvValuePresent(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const distributedSafety = isEnvValuePresent(process.env.UPSTASH_REDIS_REST_URL)
    && isEnvValuePresent(process.env.UPSTASH_REDIS_REST_TOKEN);
  return data && distributedSafety && isDodoConfigured();
}

export function isDodoConfigured() {
  return ['test_mode', 'live_mode'].includes(process.env.DODO_PAYMENTS_ENVIRONMENT ?? '')
    && ['DODO_PAYMENTS_API_KEY', 'DODO_PAYMENTS_WEBHOOK_KEY', 'DODO_PAYMENTS_PRODUCT_ID_USD']
      .every((name) => isEnvValuePresent(process.env[name]));
}

export function requireServerEnv(name: string) {
  const value = process.env[name];
  if (!isEnvValuePresent(value)) {
    throw new Error(`Missing required server configuration: ${name}`);
  }
  return value as string;
}
