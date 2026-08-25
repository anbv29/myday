'use client';

import { Show, UserButton } from '@clerk/react';

export function AuthControls() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
      && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('replace_me'),
  );

  if (!configured) {
    return <a className="header-login" href="/sign-in">Log in</a>;
  }

  return (
    <div className="auth-controls">
      <Show when="signed-out">
        <a className="header-login" href="/sign-in">Log in</a>
        <a className="header-join" href="/sign-up">Join MYDAY</a>
      </Show>
      <Show when="signed-in">
        <a className="header-login" href="/account">My account</a>
        <UserButton />
      </Show>
    </div>
  );
}
