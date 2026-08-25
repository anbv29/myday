import type { Metadata } from 'next';
import { InfoPage } from '@/components/info/info-page';

export const metadata: Metadata = { title: 'FAQ', description: 'How date claims, payments, privacy, and outbids work on MYDAY.LOL.' };
const questions = [
  ['What does claiming a date mean?', 'A claim places your title and story in MYDAY’s public record for that calendar date. It is a platform record, not legal ownership of a date, trademark, domain, or event.'],
  ['Can more than one person own the same date?', 'Only one claim is current at a time. Earlier valid claims remain in history when a higher verified claim replaces them.'],
  ['How is the next price calculated?', 'The server reads the latest authoritative claim and calculates the minimum valid amount at checkout. Browser-displayed prices are never authoritative.'],
  ['What is the minimum price?', 'An unclaimed date starts at US$1. India checkout uses the latest available daily ECB USD/INR reference and charges the equivalent amount in rupees through Razorpay. An occupied date requires at least 10% or US$1 more, whichever is greater.'],
  ['Can customers outside India pay?', 'Yes, through Razorpay international cards in USD, after international payments have been approved and enabled on the MYDAY Razorpay account.'],
  ['When does ownership change?', 'Only after the payment provider sends a valid signed webhook and the database completes the claim transition. A redirect or browser success screen is not proof of payment.'],
  ['What if someone else completes first?', 'The first valid transaction to complete the authoritative database transition wins. A later verified payment enters the documented conflict and refund process without changing ownership.'],
  ['Can I hide a claim?', 'Claims support public, unlisted, and private visibility. Private content is excluded from public discovery and leaderboards.'],
  ['Can I resell a date?', 'No. MYDAY has no resale marketplace. Claims are personal public records governed by the Terms.'],
  ['How do I get help?', 'Use the support page and include the date and checkout reference when the issue concerns a payment. Never send passwords, card details, session tokens, or secret keys.'],
];

export default function FaqPage() {
  return <InfoPage eyebrow="Frequently asked questions" title={<>THE SHORT<br />VERSION.</>} intro="Clear answers about the public record, verified payments, and what a date claim represents."><section className="faq-list">{questions.map(([question, answer], index) => <details key={question}><summary><span>{String(index + 1).padStart(2, '0')}</span>{question}</summary><p>{answer}</p></details>)}</section><p className="info-cta">Still unsure? <a href="/contact">Contact support ↗</a></p></InfoPage>;
}
