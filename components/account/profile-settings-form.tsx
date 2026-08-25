'use client';

import Link from 'next/link';
import { useState } from 'react';

export function ProfileSettingsForm({ username, initialDisplayName, initialBio }: { username: string; initialDisplayName: string | null; initialBio: string | null }) {
  const [displayName, setDisplayName] = useState(initialDisplayName ?? '');
  const [bio, setBio] = useState(initialBio ?? '');
  const [state, setState] = useState<{ kind: 'idle' | 'saving' | 'success' | 'error'; message?: string }>({ kind: 'idle' });

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: 'saving' });
    const response = await fetch('/api/account/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName, bio }) });
    const result = await response.json() as { error?: string; displayName?: string | null; bio?: string | null };
    if (!response.ok) { setState({ kind: 'error', message: result.error ?? 'Profile could not be saved.' }); return; }
    setDisplayName(result.displayName ?? '');
    setBio(result.bio ?? '');
    setState({ kind: 'success', message: 'Profile saved.' });
  }

  return (
    <form className="settings-form" onSubmit={save}>
      <div className="settings-static"><span>MYDAY username</span><strong>@{username.replace(/^@/, '')}</strong><Link href="/onboarding/username">Change username ↗</Link></div>
      <label>Display name<input value={displayName} onChange={(event) => { setDisplayName(event.target.value); setState({ kind: 'idle' }); }} maxLength={60} placeholder="How your name appears" /></label>
      <label>Public bio<textarea value={bio} onChange={(event) => { setBio(event.target.value); setState({ kind: 'idle' }); }} maxLength={280} rows={5} placeholder="A short line about the days you collect." /><small>{bio.length}/280</small></label>
      <div className="settings-submit"><button className="button button-primary" type="submit" disabled={state.kind === 'saving'}>{state.kind === 'saving' ? 'Saving…' : 'Save profile'}</button><p className={state.kind} role="status">{state.message}</p></div>
    </form>
  );
}
