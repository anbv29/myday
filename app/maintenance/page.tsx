import type { Metadata } from 'next';
import { InfoPage } from '@/components/info/info-page';

export const metadata: Metadata = { title: 'Service status', robots: { index: false, follow: false } };
export default function MaintenancePage() {
  return <InfoPage eyebrow="Degraded service" title={<>THE RECORD<br />IS PAUSED.</>} intro="When a critical dependency cannot be verified, MYDAY pauses sensitive actions instead of guessing."><section><h2>Your data remains authoritative</h2><p>Payment redirects never grant ownership, cached content never decides permissions, and a temporarily unavailable service does not create a duplicate claim.</p><p><a href="/">Return to the public record ↗</a></p></section></InfoPage>;
}
