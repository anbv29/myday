import Link from 'next/link';

export function AuthConfigurationNotice() {
  return (
    <div className="auth-notice" role="status">
      <p className="eyebrow">Identity foundation ready</p>
      <h1>CONNECT CLERK<br />TO SIGN IN.</h1>
      <p>
        Authentication is implemented but intentionally unavailable until valid
        Clerk and Supabase environment values are configured. No mock session is used.
      </p>
      <Link className="button button-primary" href="/">Return to the public board</Link>
    </div>
  );
}
