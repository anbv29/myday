import type { Metadata } from 'next';
import { InfoPage } from '@/components/info/info-page';

export const metadata: Metadata = { title: 'Delivery policy', description: 'How digital MYDAY.LOL date claims are delivered.' };

export default function ShippingPage() {
  return <InfoPage eyebrow="Shipping and delivery policy" title={<>NOTHING SHIPS.<br />THE RECORD UPDATES.</>} intro="MYDAY sells a digital platform service. No physical product is manufactured or shipped." updated="August 25, 2026"><section><h2>Digital delivery</h2><p>After Razorpay sends a valid signed payment event and the database safely completes the claim transition, the date claim is delivered by appearing in your account and on the public, unlisted, or private surfaces selected during checkout.</p></section><section><h2>Delivery timing</h2><p>Most verified transitions complete shortly after the payment event arrives. Provider retries or temporary dependency failures may delay the update. A browser success screen alone is not delivery or proof of ownership.</p></section><section><h2>No shipping charge</h2><p>There are no packing, postage, courier, or physical-delivery fees. Contact <a href="mailto:anubhavpandey269@gmail.com">anubhavpandey269@gmail.com</a> if a verified payment remains unresolved.</p></section></InfoPage>;
}
