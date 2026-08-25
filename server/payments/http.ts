export async function paymentFetch(url: string, init: RequestInit, timeoutMilliseconds = 10_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMilliseconds);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
    const data = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok) throw new Error(`payment_provider_${response.status}`);
    if (!data) throw new Error('payment_provider_invalid_response');
    return data;
  } finally {
    clearTimeout(timeout);
  }
}
