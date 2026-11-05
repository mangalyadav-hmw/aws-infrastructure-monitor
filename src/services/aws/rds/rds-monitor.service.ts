import { DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import { GetMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { getCloudWatchClient, getRdsClient } from '@/lib/aws-client';
import { getEnv } from '@/lib/config/env';
import type { RdsMonitoringSnapshot } from '@/lib/monitoring/types';

async function fetchRdsMetric(
  dbInstanceIdentifier: string,
  metricName: 'CPUUtilization' | 'FreeStorageSpace' | 'DatabaseConnections',
): Promise<number | null> {
  const cloudWatch = getCloudWatchClient();
  const end = new Date();
  const start = new Date(end.getTime() - 15 * 60 * 1000);

  const response = await cloudWatch.send(
    new GetMetricDataCommand({
      StartTime: start,
      EndTime: end,
      MetricDataQueries: [
        {
          Id: 'm1',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/RDS',
              MetricName: metricName,
              Dimensions: [{ Name: 'DBInstanceIdentifier', Value: dbInstanceIdentifier }],
            },
            Period: 300,
            Stat: 'Average',
          },
          ReturnData: true,
        },
      ],
    }),
  );

  const values = response.MetricDataResults?.[0]?.Values;
  if (!values || values.length === 0) {
    return null;
  }
  return values[values.length - 1] ?? null;
}

function deriveHealth(
  status: string | null,
  cpu: number | null,
  freeStorageBytes: number | null,
): 'healthy' | 'degraded' | 'unknown' {
  if (!status) {
    return 'unknown';
  }
  if (status !== 'available') {
    return 'degraded';
  }
  if (cpu !== null && cpu > 90) {
    return 'degraded';
  }
  if (freeStorageBytes !== null && freeStorageBytes < 5 * 1024 * 1024 * 1024) {
    return 'degraded';
  }
  return 'healthy';
}

export async function collectRdsMonitoringSnapshot(): Promise<RdsMonitoringSnapshot> {
  const { AWS_RDS_DB_IDENTIFIER } = getEnv();
  const rds = getRdsClient();

  const response = await rds.send(
    new DescribeDBInstancesCommand({
      DBInstanceIdentifier: AWS_RDS_DB_IDENTIFIER,
    }),
  );

  const db = response.DBInstances?.[0];
  if (!db) {
    throw new Error(`RDS instance "${AWS_RDS_DB_IDENTIFIER}" was not found`);
  }

  const identifier = db.DBInstanceIdentifier ?? AWS_RDS_DB_IDENTIFIER;
  const [cpuUtilizationPercent, freeStorageBytes, databaseConnections] = await Promise.all([
    fetchRdsMetric(identifier, 'CPUUtilization'),
    fetchRdsMetric(identifier, 'FreeStorageSpace'),
    fetchRdsMetric(identifier, 'DatabaseConnections'),
  ]);

  const status = db.DBInstanceStatus ?? null;
  const availability =
    status === 'available' ? 'available' : status ? 'unavailable' : 'unknown';

  return {
    dbInstanceIdentifier: identifier,
    engine: db.Engine ?? null,
    engineVersion: db.EngineVersion ?? null,
    status,
    availability,
    cpuUtilizationPercent,
    freeStorageBytes,
    databaseConnections,
    endpoint: db.Endpoint?.Address ?? null,
    health: deriveHealth(status, cpuUtilizationPercent, freeStorageBytes),
  };
}
