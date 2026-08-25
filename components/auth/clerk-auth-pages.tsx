'use client';

import { SignIn, SignUp } from '@clerk/react';

const appearance = {
  variables: {
    colorPrimary: '#ff5833',
    borderRadius: '0px',
    fontFamily: 'Arial, Helvetica, sans-serif',
  },
};

export function ClerkSignIn() {
  return <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" appearance={appearance} />;
}

export function ClerkSignUp() {
  return <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" appearance={appearance} />;
}
