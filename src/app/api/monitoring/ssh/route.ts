import { NextResponse } from 'next/server';
import {
  assertDashboardAuthorized,
  assertMonitoringReady,
  monitoringErrorResponse,
} from '@/lib/security/api-auth';
import { collectSshWithMeta } from '@/services/monitoring/monitoring-orchestrator.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const unauthorized = assertDashboardAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  const notReady = assertMonitoringReady();
  if (notReady) {
    return notReady;
  }

  try {
    const data = await collectSshWithMeta();
    return NextResponse.json(data);
  } catch (error) {
    return monitoringErrorResponse(error, 'Failed to collect SSH monitoring data');
  }
}
