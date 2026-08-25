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

export function isClerkConfigured() {
  return isEnvValuePresent(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
    && isEnvValuePresent(process.env.CLERK_SECRET_KEY);
}

export function isSupabaseConfigured() {
  return isEnvValuePresent(process.env.NEXT_PUBLIC_SUPABASE_URL)
    && isEnvValuePresent(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function isIdentityStackConfigured() {
  return isClerkConfigured() && isSupabaseConfigured();
}

export function isProductionConfigurationComplete() {
  const identityAndData = isIdentityStackConfigured()
    && isEnvValuePresent(process.env.CLERK_WEBHOOK_SIGNING_SECRET)
    && isEnvValuePresent(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const distributedSafety = isEnvValuePresent(process.env.UPSTASH_REDIS_REST_URL)
    && isEnvValuePresent(process.env.UPSTASH_REDIS_REST_TOKEN);
  const razorpay = isEnvValuePresent(process.env.RAZORPAY_KEY_ID)
    && isEnvValuePresent(process.env.RAZORPAY_KEY_SECRET)
    && isEnvValuePresent(process.env.RAZORPAY_WEBHOOK_SECRET);
  return identityAndData && distributedSafety && razorpay;
}

export function requireServerEnv(name: string) {
  const value = process.env[name];
  if (!isEnvValuePresent(value)) {
    throw new Error(`Missing required server configuration: ${name}`);
  }
  return value as string;
}
