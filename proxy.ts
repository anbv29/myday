import { NextResponse, type NextRequest } from 'next/server';

const sensitivePrefixes = ['/account', '/api', '/claim', '/onboarding', '/payment', '/ready'];
const publicPrefixes = ['/', '/activity', '/contact', '/day/', '/explore', '/faq', '/leaderboard', '/privacy', '/search', '/terms', '/trending'];

function securityHeaders(response: NextResponse, requestId: string) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  response.headers.set('X-Request-Id', requestId);
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self' https://checkout.stripe.com https://api.razorpay.com",
        "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com https://js.stripe.com https://checkout.razorpay.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https://*.supabase.co https://*.clerk.accounts.dev https://*.clerk.com https://*.upstash.io https://api.stripe.com https://api.razorpay.com",
        "frame-src https://*.clerk.accounts.dev https://*.clerk.com https://js.stripe.com https://hooks.stripe.com https://api.razorpay.com https://checkout.razorpay.com",
        "worker-src 'self' blob:",
        'upgrade-insecure-requests',
      ].join('; '),
    );
  }
}

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  requestHeaders.set('x-request-id', requestId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const pathname = request.nextUrl.pathname;

  if (sensitivePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    response.headers.set('Cache-Control', 'private, no-store');
  } else if (
    request.method === 'GET'
    && !request.headers.has('authorization')
    && !request.headers.has('cookie')
    && publicPrefixes.some((prefix) => pathname === prefix || (prefix === '/day/' && pathname.startsWith(prefix)))
  ) {
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  }
  securityHeaders(response, requestId);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.svg).*)'],
};
