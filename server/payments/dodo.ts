import DodoPayments from 'dodopayments';
import { isDodoConfigured, requireServerEnv } from '@/lib/env';
import { createDodoCheckout, resumeDodoCheckout } from '@/server/payments/dodo-checkout';
import { verifyDodoEvent } from '@/server/payments/dodo-events';
import { refundDodoPayment } from '@/server/payments/dodo-refund';
import type { CheckoutCreation, PaymentProvider } from '@/server/payments/types';

export class DodoPaymentProvider implements PaymentProvider {
  readonly name = 'dodo' as const;
  isConfigured() { return isDodoConfigured(); }

  private client() {
    const environment = requireServerEnv('DODO_PAYMENTS_ENVIRONMENT');
    if (environment !== 'test_mode' && environment !== 'live_mode') throw new Error('invalid_dodo_environment');
    return new DodoPayments({
      bearerToken: requireServerEnv('DODO_PAYMENTS_API_KEY'),
      webhookKey: requireServerEnv('DODO_PAYMENTS_WEBHOOK_KEY'),
      environment, timeout: 8000, maxRetries: 0,
    });
  }

  async createCheckout(input: CheckoutCreation) {
    try { return await createDodoCheckout(this.client(), input); }
    catch (error) {
      if (error instanceof DodoPayments.APIError && (error.status === 401 || error.status === 403)) throw new Error('payment_provider_401');
      throw error;
    }
  }
  async resumeCheckout(reference: string, input: CheckoutCreation) { return resumeDodoCheckout(this.client(), reference, input); }
  async verifyWebhook(rawBody: string, headers: Headers) { return verifyDodoEvent(this.client(), rawBody, headers); }
  async refund(paymentReference: string, amountMinor: number, intentId: string) {
    return refundDodoPayment(this.client(), paymentReference, amountMinor, intentId);
  }
}
