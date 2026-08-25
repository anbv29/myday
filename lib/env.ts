export const isEnvValuePresent = (value: string | undefined) => Boolean(
  value
  && value.trim()
  && !/replace[-_]?me/i.test(value)
  && !/^your[-_]/i.test(value),
);

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
  const stripe = isEnvValuePresent(process.env.STRIPE_SECRET_KEY)
    && isEnvValuePresent(process.env.STRIPE_WEBHOOK_SECRET);
  const razorpay = isEnvValuePresent(process.env.RAZORPAY_KEY_ID)
    && isEnvValuePresent(process.env.RAZORPAY_KEY_SECRET)
    && isEnvValuePresent(process.env.RAZORPAY_WEBHOOK_SECRET);
  return identityAndData && distributedSafety && stripe && razorpay;
}

export function requireServerEnv(name: string) {
  const value = process.env[name];
  if (!isEnvValuePresent(value)) {
    throw new Error(`Missing required server configuration: ${name}`);
  }
  return value as string;
}
