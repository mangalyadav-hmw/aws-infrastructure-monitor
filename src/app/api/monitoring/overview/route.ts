import { NextResponse } from 'next/server';
import { assertDashboardAuthorized, monitoringErrorResponse } from '@/lib/security/api-auth';
import { collectInfrastructureOverview } from '@/services/monitoring/monitoring-orchestrator.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const unauthorized = assertDashboardAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const overview = await collectInfrastructureOverview();
    return NextResponse.json(overview);
  } catch (error) {
    return monitoringErrorResponse(error, 'Failed to collect infrastructure overview');
  }
}
