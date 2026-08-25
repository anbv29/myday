import { createClient } from '@supabase/supabase-js';
import { requireServerEnv } from '@/lib/env';

export function createUserSupabaseClient(accessToken: string) {
  return createClient(
    requireServerEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireServerEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    {
      accessToken: async () => accessToken,
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}
