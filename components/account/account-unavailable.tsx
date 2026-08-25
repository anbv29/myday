import { AuthConfigurationNotice } from '@/components/auth/auth-configuration-notice';

export function AccountUnavailable({ unconfigured = false }: { unconfigured?: boolean }) {
  if (unconfigured) return <main className="onboarding-page shell"><AuthConfigurationNotice /></main>;
  return <main className="onboarding-page shell"><div className="auth-notice" role="alert"><p className="eyebrow">Account unavailable</p><h1>WE COULDN’T<br />LOAD IT.</h1><p>No settings were changed. Please try again when the account service is available.</p></div></main>;
}
