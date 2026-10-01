export function isDodoCheckoutUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port
      && ['checkout.dodopayments.com', 'test.checkout.dodopayments.com'].includes(url.hostname)
      && /^\/session\/[A-Za-z0-9_-]+$/.test(url.pathname);
  } catch {
    return false;
  }
}
