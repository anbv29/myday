export type PaymentProviderName = 'razorpay' | 'dodo';

export type CheckoutCreation = {
  intentId: string;
  date: string;
  title: string;
  amountMinor: number;
  currency: string;
  appUrl: string;
  returnUrl?: string;
};

export type ClientCheckout =
  | { provider: 'razorpay'; checkoutReference: string; keyId: string; amountMinor: number; currency: string; name: string; description: string }
  | { provider: 'dodo'; checkoutReference: string; url: string; amountMinor: number; currency: string };

export type VerifiedPaymentEvent = {
  kind?: 'payment';
  provider: PaymentProviderName;
  eventId: string;
  checkoutReference: string;
  paymentReference: string;
  amountMinor: number;
  currency: string;
};

export type VerifiedRefundEvent = {
  kind: 'refund';
  provider: PaymentProviderName;
  eventId: string;
  paymentReference: string;
  refundReference: string;
  amountMinor: number;
  currency: string;
};

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  isConfigured(): boolean;
  createCheckout(input: CheckoutCreation): Promise<ClientCheckout>;
  resumeCheckout(reference: string, input: CheckoutCreation): Promise<ClientCheckout>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedPaymentEvent | VerifiedRefundEvent | null>;
  refund(paymentReference: string, amountMinor: number, intentId: string): Promise<string | null>;
}
