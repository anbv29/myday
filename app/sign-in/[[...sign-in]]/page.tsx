import { AuthConfigurationNotice } from '@/components/auth/auth-configuration-notice';
import { ClerkSignIn } from '@/components/auth/clerk-auth-pages';
import { isIdentityStackConfigured } from '@/lib/env';

export default function SignInPage() {
  return (
    <main className="auth-page shell">
      <div className="auth-page-intro">
        <p className="eyebrow">Your dates, in one place</p>
        <h1>WELCOME<br />BACK.</h1>
        <p>Sign in to claim a date, manage your public profile, and follow claim activity.</p>
      </div>
      <div className="auth-panel">
        {isIdentityStackConfigured() ? <ClerkSignIn /> : <AuthConfigurationNotice />}
      </div>
    </main>
  );
}
