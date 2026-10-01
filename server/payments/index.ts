import { DodoPaymentProvider } from '@/server/payments/dodo';

const dodo = new DodoPaymentProvider();

export function selectPaymentProvider(billingCountry: string) {
  if (!/^[A-Z]{2}$/.test(billingCountry.toUpperCase())) throw new Error('invalid_billing_country');
  return dodo;
}

export function getPaymentProvider() {
  return dodo;
}
