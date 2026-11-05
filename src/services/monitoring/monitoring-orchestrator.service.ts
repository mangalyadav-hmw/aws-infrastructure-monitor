import { getCached, setCached, type CachedResult } from '@/lib/monitoring/cache';
import { getEnv } from '@/lib/config/env';
import { runExclusive } from '@/lib/monitoring/request-guard';
import type {
  Ec2MonitoringSnapshot,
  InfrastructureOverview,
  MonitoringMeta,
  RdsMonitoringSnapshot,
  SshMonitoringSnapshot,
} from '@/lib/monitoring/types';
import { collectEc2MonitoringSnapshot } from '@/services/aws/ec2/ec2-monitor.service';
import { collectRdsMonitoringSnapshot } from '@/services/aws/rds/rds-monitor.service';
import { collectSshMonitoringSnapshot } from '@/services/ssh/ssh-monitor.service';

type SnapshotWithMeta<T> = T & MonitoringMeta;

async function collectWithCache<T>(
  cacheKey: string,
  collector: () => Promise<T>,
): Promise<SnapshotWithMeta<T>> {
  const { MONITORING_CACHE_TTL_SECONDS } = getEnv();
  const cached = getCached<T>(cacheKey);

  if (cached && !cached.stale) {
    return wrapWithMeta(cached.data, cached.fetchedAt, false, true, null);
  }

  return runExclusive(cacheKey, async () => {
    const freshCached = getCached<T>(cacheKey);
    if (freshCached && !freshCached.stale) {
      return wrapWithMeta(freshCached.data, freshCached.fetchedAt, false, true, null);
    }

    try {
      const data = await collector();
      const checkedAt = new Date().toISOString();
      setCached(cacheKey, data, MONITORING_CACHE_TTL_SECONDS);
      return wrapWithMeta(data, checkedAt, false, false, null, checkedAt);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Monitoring request failed';
      if (cached) {
        return wrapWithMeta(
          cached.data,
          cached.fetchedAt,
          true,
          true,
          message,
          cached.fetchedAt,
        );
      }
      throw error;
    }
  });
}

function wrapWithMeta<T>(
  data: T,
  checkedAt: string,
  stale: boolean,
  fromCache: boolean,
  error: string | null,
  lastSuccessfulCheck: string | null = stale ? null : checkedAt,
): SnapshotWithMeta<T> {
  return {
    ...data,
    checkedAt,
    stale,
    fromCache,
    error,
    lastSuccessfulCheck: error ? null : lastSuccessfulCheck ?? checkedAt,
  };
}

function deriveOverallHealth(
  ec2: SnapshotWithMeta<Ec2MonitoringSnapshot>,
  rds: SnapshotWithMeta<RdsMonitoringSnapshot>,
  ssh: SnapshotWithMeta<SshMonitoringSnapshot>,
): InfrastructureOverview['overallHealth'] {
  const signals: Array<'healthy' | 'degraded' | 'critical' | 'unknown'> = [];

  if (ec2.error || ec2.stale) {
    signals.push('degraded');
  } else if (ec2.state !== 'running') {
    signals.push('critical');
  } else if (ec2.systemStatus !== 'ok' || ec2.instanceStatus !== 'ok') {
    signals.push('degraded');
  } else {
    signals.push('healthy');
  }

  if (rds.error || rds.stale) {
    signals.push('degraded');
  } else if (rds.health === 'degraded') {
    signals.push('degraded');
  } else if (rds.health === 'healthy') {
    signals.push('healthy');
  } else {
    signals.push('unknown');
  }

  if (ssh.error || ssh.stale) {
    signals.push('degraded');
  } else if (
    ssh.connectionError?.includes('not configured') ||
    ssh.connectionError?.includes('SSH agent')
  ) {
    signals.push('unknown');
  } else if (!ssh.connected) {
    signals.push('critical');
  } else {
    signals.push('healthy');
  }

  if (signals.includes('critical')) {
    return 'critical';
  }
  if (signals.includes('degraded')) {
    return 'degraded';
  }
  if (signals.every((signal) => signal === 'healthy')) {
    return 'healthy';
  }
  return 'unknown';
}

export async function collectInfrastructureOverview(): Promise<InfrastructureOverview> {
  const [ec2, rds, ssh] = await Promise.all([
    collectWithCache('monitoring:ec2', collectEc2MonitoringSnapshot),
    collectWithCache('monitoring:rds', collectRdsMonitoringSnapshot),
    collectWithCache('monitoring:ssh', collectSshMonitoringSnapshot),
  ]);

  return {
    ec2,
    rds,
    ssh,
    overallHealth: deriveOverallHealth(ec2, rds, ssh),
  };
}

export async function collectEc2WithMeta(): Promise<SnapshotWithMeta<Ec2MonitoringSnapshot>> {
  return collectWithCache('monitoring:ec2', collectEc2MonitoringSnapshot);
}

export async function collectRdsWithMeta(): Promise<SnapshotWithMeta<RdsMonitoringSnapshot>> {
  return collectWithCache('monitoring:rds', collectRdsMonitoringSnapshot);
}

export async function collectSshWithMeta(): Promise<SnapshotWithMeta<SshMonitoringSnapshot>> {
  return collectWithCache('monitoring:ssh', collectSshMonitoringSnapshot);
}

export type { CachedResult };
