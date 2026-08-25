'use client';

import { useState } from 'react';

type Preferences = { emailClaimUpdates: boolean; emailOutbidAlerts: boolean; emailProductUpdates: boolean };

export function NotificationSettingsForm({ initial }: { initial: Preferences }) {
  const [preferences, setPreferences] = useState(initial);
  const [state, setState] = useState<{ kind: 'idle' | 'saving' | 'success' | 'error'; message?: string }>({ kind: 'idle' });
  function change(key: keyof Preferences, value: boolean) { setPreferences((current) => ({ ...current, [key]: value })); setState({ kind: 'idle' }); }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: 'saving' });
    const response = await fetch('/api/account/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preferences) });
    const result = await response.json() as Preferences & { error?: string };
    if (!response.ok) { setState({ kind: 'error', message: result.error ?? 'Preferences could not be saved.' }); return; }
    setPreferences({ emailClaimUpdates: result.emailClaimUpdates, emailOutbidAlerts: result.emailOutbidAlerts, emailProductUpdates: result.emailProductUpdates });
    setState({ kind: 'success', message: 'Notification preferences saved.' });
  }
  return (
    <form className="notification-form" onSubmit={save}>
      <label><span><strong>Claim updates</strong><small>Payment confirmation, refund progress, and important claim-state changes.</small></span><input type="checkbox" checked={preferences.emailClaimUpdates} onChange={(event) => change('emailClaimUpdates', event.target.checked)} /></label>
      <label><span><strong>Outbid alerts</strong><small>Know when another verified claim replaces one of your dates.</small></span><input type="checkbox" checked={preferences.emailOutbidAlerts} onChange={(event) => change('emailOutbidAlerts', event.target.checked)} /></label>
      <label><span><strong>Product notes</strong><small>Occasional MYDAY feature announcements. Off by default.</small></span><input type="checkbox" checked={preferences.emailProductUpdates} onChange={(event) => change('emailProductUpdates', event.target.checked)} /></label>
      <div className="settings-submit"><button className="button button-primary" type="submit" disabled={state.kind === 'saving'}>{state.kind === 'saving' ? 'Saving…' : 'Save preferences'}</button><p className={state.kind} role="status">{state.message}</p></div>
    </form>
  );
}
