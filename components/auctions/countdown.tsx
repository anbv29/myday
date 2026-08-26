'use client';

import { useEffect, useState } from 'react';

type CountdownValue = { days: number; hours: number; minutes: number; seconds: number } | null;

function remaining(target: string): CountdownValue {
  const milliseconds = Date.parse(`${target}T23:59:59Z`) - Date.now();
  if (milliseconds <= 0) return null;
  const seconds = Math.floor(milliseconds / 1000);
  return {
    days: Math.floor(seconds / 86_400),
    hours: Math.floor(seconds / 3_600) % 24,
    minutes: Math.floor(seconds / 60) % 60,
    seconds: seconds % 60,
  };
}

export function AuctionCountdown({ target, compact = false }: { target: string; compact?: boolean }) {
  const [value, setValue] = useState<CountdownValue>(null);

  useEffect(() => {
    const update = () => setValue(remaining(target));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [target]);

  if (!value) return <span className="auction-open-label">Open bidding</span>;
  if (compact) {
    return <span>{value.days}d {String(value.hours).padStart(2, '0')}h {String(value.minutes).padStart(2, '0')}m</span>;
  }

  return (
    <div className="auction-countdown" aria-label={`${value.days} days, ${value.hours} hours, ${value.minutes} minutes remaining`}>
      <span><strong>{String(value.days).padStart(2, '0')}</strong><small>Days</small></span>
      <i>:</i>
      <span><strong>{String(value.hours).padStart(2, '0')}</strong><small>Hrs</small></span>
      <i>:</i>
      <span><strong>{String(value.minutes).padStart(2, '0')}</strong><small>Min</small></span>
      <i>:</i>
      <span><strong>{String(value.seconds).padStart(2, '0')}</strong><small>Sec</small></span>
    </div>
  );
}
