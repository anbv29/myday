import { RazorpayPaymentProvider } from '@/server/payments/razorpay';

const razorpay = new RazorpayPaymentProvider();

export function selectPaymentProvider(billingCountry: string) {
  if (!/^[A-Z]{2}$/.test(billingCountry.toUpperCase())) throw new Error('invalid_billing_country');
  return razorpay;
}

export function getPaymentProvider() {
  return razorpay;
}
