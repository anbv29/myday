import { redirect } from 'next/navigation';
import { AuthConfigurationNotice } from '@/components/auth/auth-configuration-notice';
import { UsernameForm } from '@/components/onboarding/username-form';
import { isIdentityStackConfigured } from '@/lib/env';
import { getRequestIdentity } from '@/server/auth/identity';
import { createUserSupabaseClient } from '@/server/supabase/user';

export const dynamic = 'force-dynamic';

export default async function UsernameOnboardingPage() {
  if (!isIdentityStackConfigured()) {
    return <main className="onboarding-page shell"><AuthConfigurationNotice /></main>;
  }

  const identity = await getRequestIdentity();
  if (!identity) redirect('/sign-in?redirect_url=/onboarding/username');

  const token = await identity.getSupabaseToken();
  if (!token) redirect('/sign-in?redirect_url=/onboarding/username');

  const supabase = createUserSupabaseClient(token);
  const { error: ensureError } = await supabase.rpc('ensure_app_user');
  if (ensureError) {
    return (
      <main className="onboarding-page shell">
        <div className="auth-notice" role="alert">
          <p className="eyebrow">Service unavailable</p>
          <h1>WE COULDN’T<br />LOAD YOUR PROFILE.</h1>
          <p>Nothing was changed. Please retry when the identity service is available.</p>
        </div>
      </main>
    );
  }

  const { data } = await supabase.rpc('get_my_profile');
  const profile = Array.isArray(data) ? data[0] : data;

  return (
    <main className="onboarding-page shell">
      <div className="onboarding-copy">
        <p className="eyebrow">One name across MYDAY</p>
        <h1>WHAT SHOULD<br />THE BOARD<br />CALL YOU?</h1>
        <p>Your username appears beside public claims and in your profile URL.</p>
      </div>
      <UsernameForm initialUsername={profile?.username} />
    </main>
  );
}
