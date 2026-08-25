'use client';

import { ClerkProvider } from '@clerk/react';

export function AppAuthProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey || publishableKey.includes('replace_me')) return children;

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/onboarding/username"
      signUpFallbackRedirectUrl="/onboarding/username"
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: '#ff5833',
          borderRadius: '0px',
          fontFamily: 'Arial, Helvetica, sans-serif',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
