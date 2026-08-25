import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="not-found shell">
      <p className="eyebrow">404 · Unclaimed territory</p>
      <h1>THIS DAY ISN’T<br />ON THE BOARD.</h1>
      <Link className="button button-primary" href="/">Return to the leaderboard</Link>
    </main>
  );
}
