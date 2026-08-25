'use client';

import { FormEvent, useEffect, useState } from 'react';
import { usernameSchema } from '@/lib/validation/username';

type Availability = 'idle' | 'checking' | 'available' | 'unavailable' | 'error';

export function UsernameForm({ initialUsername }: { initialUsername?: string | null }) {
  const [username, setUsername] = useState(initialUsername ?? '');
  const [availability, setAvailability] = useState<Availability>('idle');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const parsed = usernameSchema.safeParse(username);
    if (!username || !parsed.success || username === initialUsername) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setAvailability('checking');
      try {
        const response = await fetch(`/api/usernames/${encodeURIComponent(username)}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (response.status === 429) {
          setAvailability('error');
          setMessage('Too many checks. Wait a moment and try again.');
          return;
        }
        const payload = await response.json() as { available?: boolean; error?: string };
        setAvailability(payload.available ? 'available' : 'unavailable');
        setMessage(payload.available ? 'This username is available.' : 'This username is unavailable.');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setAvailability('error');
          setMessage('Availability could not be checked right now.');
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [initialUsername, username]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = usernameSchema.safeParse(username);
    if (!parsed.success) {
      setAvailability('error');
      setMessage(parsed.error.issues[0]?.message ?? 'Choose a valid username.');
      return;
    }

    setSubmitting(true);
    setMessage('');
    try {
      const response = await fetch('/api/onboarding/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ username: parsed.data }),
      });
      const payload = await response.json() as { username?: string; error?: string };
      if (!response.ok) {
        setAvailability(response.status === 409 ? 'unavailable' : 'error');
        setMessage(payload.error ?? 'The username could not be saved.');
        return;
      }
      setUsername(payload.username ?? parsed.data);
      setAvailability('available');
      setMessage(`@${payload.username ?? parsed.data} is yours.`);
    } catch {
      setAvailability('error');
      setMessage('The username could not be saved right now.');
    } finally {
      setSubmitting(false);
    }
  }

  const validity = usernameSchema.safeParse(username);

  return (
    <form className="username-form" onSubmit={submit} noValidate>
      <label htmlFor="username">Your MYDAY username</label>
      <div className="username-input-wrap">
        <span aria-hidden="true">@</span>
        <input
          id="username"
          name="username"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
            setAvailability('idle');
            setMessage('');
          }}
          minLength={3}
          maxLength={20}
          pattern="[A-Za-z0-9_]+"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby="username-help username-status"
          aria-invalid={availability === 'unavailable' || availability === 'error'}
        />
      </div>
      <p id="username-help">3–20 letters, numbers, or underscores. Usernames are case-insensitive.</p>
      <p className={`username-status ${availability}`} id="username-status" aria-live="polite">
        {availability === 'checking' ? 'Checking…' : message}
      </p>
      <button
        className="button button-primary"
        type="submit"
        disabled={!validity.success || submitting || availability === 'checking' || availability === 'unavailable'}
      >
        {submitting ? 'Saving…' : initialUsername ? 'Update username' : 'Claim username'}
        <span aria-hidden="true">↗</span>
      </button>
    </form>
  );
}
