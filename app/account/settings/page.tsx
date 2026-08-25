import type { Metadata } from 'next';
import { AccountFrame } from '@/components/account/account-frame';
import { AccountUnavailable } from '@/components/account/account-unavailable';
import { ProfileSettingsForm } from '@/components/account/profile-settings-form';
import { requireAccount } from '@/server/account/context';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Profile settings', robots: { index: false, follow: false } };

export default async function ProfileSettingsPage() {
  const account = await requireAccount('/account/settings');
  if (account.state !== 'ready') return <AccountUnavailable unconfigured={account.state === 'unconfigured'} />;
  return <AccountFrame section="settings" username={account.summary.username}><header className="account-page-heading"><p className="eyebrow">Public identity</p><h1>PROFILE<br />SETTINGS</h1><p>Control the display name and short bio shown on your public collector profile.</p></header><section className="account-panel settings-panel"><ProfileSettingsForm username={account.summary.username} initialDisplayName={account.summary.displayName} initialBio={account.summary.bio} /></section></AccountFrame>;
}
