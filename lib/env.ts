const present = (value: string | undefined) => Boolean(value && !value.includes('replace_me'));

export function isClerkConfigured() {
  return present(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
    && present(process.env.CLERK_SECRET_KEY);
}

export function isSupabaseConfigured() {
  return present(process.env.NEXT_PUBLIC_SUPABASE_URL)
    && present(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function isIdentityStackConfigured() {
  return isClerkConfigured() && isSupabaseConfigured();
}

export function requireServerEnv(name: string) {
  const value = process.env[name];
  if (!present(value)) {
    throw new Error(`Missing required server configuration: ${name}`);
  }
  return value as string;
}
