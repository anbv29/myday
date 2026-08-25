import { NextResponse } from 'next/server';
import { isProductionConfigurationComplete } from '@/lib/env';

export const dynamic = 'force-dynamic';

export function GET() {
  const ready = isProductionConfigurationComplete();
  return NextResponse.json(
    { status: ready ? 'ready' : 'not_ready' },
    {
      status: ready ? 200 : 503,
      headers: { 'Cache-Control': 'private, no-store' },
    },
  );
}
