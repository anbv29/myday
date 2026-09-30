import type { Metadata } from 'next';
import { FreeRegistrationForm } from '@/components/claims/free-registration-form';
import { PublicPage } from '@/components/public/public-page';
import { isIsoCalendarDate } from '@/lib/public/format';
import { isSupabaseConfigured } from '@/lib/env';

export const metadata: Metadata = { title: 'Register a date for free', description: 'Share a meaningful date and its story without payment.' };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const params = await searchParams;
  const date = params.date && isIsoCalendarDate(params.date) && params.date >= '1900-01-01' && params.date <= '2100-12-31'
    ? params.date : new Date().toISOString().slice(0, 10);
  return <PublicPage source={isSupabaseConfigured() ? 'supabase' : 'unavailable'} mainClassName="registration-page shell">
    <header><h1>Give your day a story.</h1><p>Register an unclaimed date for free. Your date joins the public collection with your story and handle.</p></header>
    <div className="registration-workspace"><FreeRegistrationForm date={date} /><aside><h2>Free to share. Paid to feature.</h2><p>The first free registration appears while the date has no paid holder. A paid claim takes priority, and a higher valid payment can replace the paid holder.</p><p>A registration refers to one exact date and year. It does not reserve the date against future paid claims.</p><a href={`/claim?date=${date}`}>Prefer a paid featured date?</a></aside></div>
  </PublicPage>;
}
