export type PaymentProviderName = 'stripe' | 'razorpay';

export type CheckoutCreation = {
  intentId: string;
  date: string;
  title: string;
  amountMinor: number;
  currency: string;
  appUrl: string;
};

export type ClientCheckout =
  | { provider: 'stripe'; checkoutReference: string; redirectUrl: string }
  | { provider: 'razorpay'; checkoutReference: string; keyId: string; amountMinor: number; currency: string; name: string; description: string };

export type VerifiedPaymentEvent = {
  provider: PaymentProviderName;
  eventId: string;
  checkoutReference: string;
  paymentReference: string;
  amountMinor: number;
  currency: string;
};

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  isConfigured(): boolean;
  createCheckout(input: CheckoutCreation): Promise<ClientCheckout>;
  resumeCheckout(reference: string, input: CheckoutCreation): Promise<ClientCheckout>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedPaymentEvent | null>;
  refund(paymentReference: string, amountMinor: number, intentId: string): Promise<string>;
}
