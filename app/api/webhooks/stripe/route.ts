import { getPaymentProvider } from '@/server/payments';
import { handlePaymentWebhook } from '@/server/payments/webhook';

export async function POST(request: Request) {
  const provider = getPaymentProvider('stripe');
  if (!provider.isConfigured()) return Response.json({ error: 'Webhook is not configured.' }, { status: 503 });
  return handlePaymentWebhook(request, provider);
}
