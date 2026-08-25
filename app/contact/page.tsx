import type { Metadata } from 'next';
import { InfoPage } from '@/components/info/info-page';

export const metadata: Metadata = { title: 'Contact', description: 'Contact MYDAY.LOL support or report a security issue.' };
export default function ContactPage() {
  return <InfoPage eyebrow="Contact and support" title={<>TELL US<br />WHAT HAPPENED.</>} intro="Choose the right channel and include enough context for us to investigate safely."><section><h2>Product and payment support</h2><p>Email <a href="mailto:anubhavpandey269@gmail.com">anubhavpandey269@gmail.com</a>. Include the calendar date, your MYDAY username, provider name, and checkout reference. Do not include full card details, passwords, cookies, tokens, or secret keys.</p></section><section><h2>Security reports</h2><p>Email <a href="mailto:security@myday.lol">security@myday.lol</a> with reproducible steps and the affected route. Please avoid accessing other people’s private data or disrupting the service.</p></section><section><h2>Response expectations</h2><p>Payment and account-access issues are prioritized. Provider-side refunds and investigations may require additional processing time, but ownership never changes based on an unverified support request.</p></section></InfoPage>;
}
