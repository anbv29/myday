'use client';

import { useState, type FormEvent } from 'react';
import { freeRegistrationSchema } from '@/lib/validation/registration';

export function FreeRegistrationForm({ date }: { date: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const parsed = freeRegistrationSchema.safeParse({
      date: form.get('date'), title: form.get('title'), story: form.get('story'),
      attribution: form.get('attribution'), consent: form.get('consent') === 'on',
    });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check your details.'); return; }
    setPending(true); setError('');
    try {
      const response = await fetch('/api/dates/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Registration could not be saved.');
      setRegistered(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Registration could not be saved. Try again.'); }
    finally { setPending(false); }
  }
  if (registered) return <section className="registration-success" role="status"><h2>Your date is registered.</h2><p>Your free entry is saved. It appears in the collection unless a paid claim takes priority.</p><a className="future-button future-button-primary" href="/">View the date collection</a></section>;
  return <form className="free-registration-form" onSubmit={submit} aria-busy={pending}>
    <fieldset disabled={pending}><legend>Your public date registration</legend>
      <label>Date<input type="date" name="date" defaultValue={date} min="1900-01-01" max="2100-12-31" required /></label>
      <label>Title<input name="title" minLength={3} maxLength={100} placeholder="A day worth remembering" required /></label>
      <label>Your story<textarea name="story" minLength={3} maxLength={1000} rows={4} placeholder="What makes this day yours?" required /></label>
      <label>Public handle or HTTPS link<input name="attribution" minLength={3} maxLength={200} placeholder="@yourhandle" autoCapitalize="none" spellCheck={false} required /></label>
      <label className="registration-consent"><input type="checkbox" name="consent" required /><span>I understand that this entry is public, not exclusive ownership, and a paid claim takes priority.</span></label>
    </fieldset>
    {error ? <p className="registration-error" role="alert">{error}</p> : null}
    <button className="future-button future-button-primary" type="submit" disabled={pending}>{pending ? 'Saving your date…' : 'Register this date for free'}</button>
    <p className="registration-note">No payment or account required. Already registered or paid dates cannot be replaced for free.</p>
  </form>;
}
