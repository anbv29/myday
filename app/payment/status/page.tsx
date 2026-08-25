import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PaymentStatus } from '@/components/payments/payment-status';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = { title: 'Payment status', robots: { index: false, follow: false } };
type Props = { searchParams: Promise<{ intent?: string }> };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function PaymentStatusPage({ searchParams }: Props) {
  const { intent } = await searchParams;
  if (!intent || !uuidPattern.test(intent)) notFound();
  return (
    <>
      <a className="skip-link" href="#payment-status">Skip to payment status</a>
      <SiteHeader />
      <main id="payment-status" className="payment-page shell"><PaymentStatus intentId={intent} /></main>
      <SiteFooter />
    </>
  );
}
