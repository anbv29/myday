import { AuthConfigurationNotice } from '@/components/auth/auth-configuration-notice';
import { ClerkSignUp } from '@/components/auth/clerk-auth-pages';
import { isIdentityStackConfigured } from '@/lib/env';

export default function SignUpPage() {
  return (
    <main className="auth-page shell">
      <div className="auth-page-intro">
        <p className="eyebrow">Make a day yours</p>
        <h1>START WITH<br />YOUR NAME.</h1>
        <p>Create an account, choose a unique MYDAY username, then decide which day matters.</p>
      </div>
      <div className="auth-panel">
        {isIdentityStackConfigured() ? <ClerkSignUp /> : <AuthConfigurationNotice />}
      </div>
    </main>
  );
}
