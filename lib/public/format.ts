import type { ClaimPeriod } from '@/lib/public/types';

export function formatMoney(amountMinor: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
  }).format(amountMinor / 100);
}

export function isIsoCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function formatPublicDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  return {
    fullDate: new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(date),
    shortDate: new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date).toUpperCase(),
    month: new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(date).toUpperCase(),
    day: new Intl.DateTimeFormat('en-US', { day: '2-digit', timeZone: 'UTC' }).format(date),
    year: new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'UTC' }).format(date),
  };
}

export function getDateContext(isoDate: string, referenceDate = new Date()): { period: ClaimPeriod; distance: string } {
  const target = new Date(`${isoDate}T00:00:00.000Z`);
  const today = Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate());
  const difference = Math.round((target.getTime() - today) / 86_400_000);
  if (difference === 0) return { period: 'today', distance: 'TODAY' };
  const unit = Math.abs(difference) === 1 ? 'DAY' : 'DAYS';
  return difference > 0
    ? { period: 'future', distance: `${difference.toLocaleString('en-US')} ${unit} TO GO` }
    : { period: 'past', distance: `${Math.abs(difference).toLocaleString('en-US')} ${unit} AGO` };
}

export function formatPublicUsername(value: string | null | undefined) {
  return value ? `@${value.replace(/^@/, '')}` : null;
}

export function excerptWords(value: string | null | undefined, maxWords: number) {
  if (!value || maxWords < 1) return '';
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}…`;
}
