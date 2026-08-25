export function hasTrustedMutationOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return process.env.NODE_ENV !== 'production';
  try {
    return new URL(origin).origin === new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').origin;
  } catch {
    return false;
  }
}

export async function readBoundedBody(request: Request, maximumBytes: number) {
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (declaredLength > maximumBytes) throw new Error('body_too_large');
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maximumBytes) throw new Error('body_too_large');
  return body;
}
