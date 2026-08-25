'use client';

import { Show, UserButton } from '@clerk/react';
import Link from 'next/link';

export function AuthControls() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
      && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('replace_me'),
  );

  if (!configured) {
    return <Link className="header-login" href="/sign-in">Log in</Link>;
  }

  return (
    <div className="auth-controls">
      <Show when="signed-out">
        <Link className="header-login" href="/sign-in">Log in</Link>
        <Link className="header-join" href="/sign-up">Join MYDAY</Link>
      </Show>
      <Show when="signed-in">
        <Link className="header-login" href="/account">My account</Link>
        <UserButton />
      </Show>
    </div>
  );
}
