import type { Metadata } from 'next';
import { AccountFrame } from '@/components/account/account-frame';
import { AccountUnavailable } from '@/components/account/account-unavailable';
import { NotificationSettingsForm } from '@/components/account/notification-settings-form';
import { requireAccount } from '@/server/account/context';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Notification settings', robots: { index: false, follow: false } };

export default async function NotificationSettingsPage() {
  const account = await requireAccount('/account/notifications');
  if (account.state !== 'ready') return <AccountUnavailable unconfigured={account.state === 'unconfigured'} />;
  return <AccountFrame section="notifications" username={account.summary.username}><header className="account-page-heading"><p className="eyebrow">Email preferences</p><h1>STAY IN<br />THE LOOP.</h1><p>Choose which MYDAY events may reach the verified email on your sign-in account.</p></header><section className="account-panel settings-panel"><NotificationSettingsForm initial={{ emailClaimUpdates: account.summary.emailClaimUpdates, emailOutbidAlerts: account.summary.emailOutbidAlerts, emailProductUpdates: account.summary.emailProductUpdates }} /><p className="settings-footnote">Critical security and payment-service messages may still be sent when required. Marketing notes remain optional.</p></section></AccountFrame>;
}
