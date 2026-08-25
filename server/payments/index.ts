import { RazorpayPaymentProvider } from '@/server/payments/razorpay';
import { StripePaymentProvider } from '@/server/payments/stripe';
import type { PaymentProviderName } from '@/server/payments/types';

const providers = {
  stripe: new StripePaymentProvider(),
  razorpay: new RazorpayPaymentProvider(),
};

export function selectPaymentProvider(billingCountry: string) {
  return billingCountry.toUpperCase() === 'IN' ? providers.razorpay : providers.stripe;
}

export function getPaymentProvider(name: PaymentProviderName) {
  return providers[name];
}
