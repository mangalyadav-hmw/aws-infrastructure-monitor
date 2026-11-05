import { NextResponse } from 'next/server';
import { assertAwsCredentialsConfigured, normalizeAwsErrorMessage } from '@/lib/aws-client/credentials';
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
  const message = normalizeAwsErrorMessage(error) || fallbackMessage;
  const status = message.includes('AWS credentials') ? 503 : 502;
  return NextResponse.json(
    {
      error: message,
      checkedAt: new Date().toISOString(),
    },
    { status },
  );
}

export function assertMonitoringReady(): NextResponse | null {
  try {
    assertAwsCredentialsConfigured();
    return null;
  } catch (error) {
    return monitoringErrorResponse(error, 'Monitoring is not configured');
  }
}
