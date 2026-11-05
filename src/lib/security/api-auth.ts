import { NextResponse } from 'next/server';
import { getEnv } from '@/lib/config/env';

export function assertDashboardAuthorized(request: Request): NextResponse | null {
  const { DASHBOARD_API_SECRET } = getEnv();
  if (!DASHBOARD_API_SECRET) {
    return null;
  }

  const headerSecret = request.headers.get('x-dashboard-secret');
  if (headerSecret !== DASHBOARD_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

export function monitoringErrorResponse(error: unknown, fallbackMessage: string): NextResponse {
  const message = error instanceof Error ? error.message : fallbackMessage;
  return NextResponse.json(
    {
      error: message,
      checkedAt: new Date().toISOString(),
    },
    { status: 502 },
  );
}
