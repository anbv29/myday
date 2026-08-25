'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="not-found shell">
      <p className="eyebrow">The record did not load</p>
      <h1>SOMETHING<br />WENT WRONG.</h1>
      <button className="button button-primary" type="button" onClick={reset}>Try again</button>
    </main>
  );
}
