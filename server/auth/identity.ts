import { createClerkClient } from '@clerk/backend';
import { headers } from 'next/headers';
import { getAppOrigin, isClerkConfigured } from '@/lib/env';

export type RequestIdentity = {
  clerkUserId: string;
  getSupabaseToken: () => Promise<string | null>;
};

function getClerkClient() {
  return createClerkClient({
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  });
}

function getAuthorizedOrigin() {
  return getAppOrigin();
}

async function requestFromServerHeaders() {
  const incoming = await headers();
  return new Request(getAuthorizedOrigin(), { headers: new Headers(incoming) });
}

export async function getRequestIdentity(request?: Request): Promise<RequestIdentity | null> {
  if (!isClerkConfigured()) return null;

  const authenticated = await getClerkClient().authenticateRequest(
    request ?? await requestFromServerHeaders(),
    { authorizedParties: [getAuthorizedOrigin()] },
  );
  if (!authenticated.isAuthenticated) return null;

  const session = authenticated.toAuth();
  if (!session.userId) return null;

  return {
    clerkUserId: session.userId,
    getSupabaseToken: async () => authenticated.token,
  };
}
