import {
  DescribeInstancesCommand,
  DescribeInstanceStatusCommand,
  type Instance,
} from '@aws-sdk/client-ec2';
import {
  GetMetricDataCommand,
  type MetricDataResult,
} from '@aws-sdk/client-cloudwatch';
import { getCloudWatchClient, getEc2Client } from '@/lib/aws-client';
import { getEnv } from '@/lib/config/env';
import type { Ec2MonitoringSnapshot } from '@/lib/monitoring/types';

function getInstanceName(instance: Instance): string | null {
  const nameTag = instance.Tags?.find((tag) => tag.Key === 'Name');
  return nameTag?.Value ?? null;
}

function pickInstance(instances: Instance[], instanceId?: string, privateIp?: string): Instance {
  if (instanceId) {
    const match = instances.find((item) => item.InstanceId === instanceId);
    if (match) {
      return match;
    }
  }
  if (privateIp) {
    const match = instances.find((item) => item.PrivateIpAddress === privateIp);
    if (match) {
      return match;
    }
  }
  if (instances.length === 1) {
    return instances[0];
  }
  throw new Error('Unable to resolve target EC2 instance from configuration');
}

async function fetchLatestMetric(
  instanceId: string,
  metricName: 'CPUUtilization' | 'NetworkIn' | 'NetworkOut',
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
              Namespace: 'AWS/EC2',
              MetricName: metricName,
              Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
            },
            Period: 300,
            Stat: 'Average',
          },
          ReturnData: true,
        },
      ],
    }),
  );

  return latestMetricValue(response.MetricDataResults?.[0]);
}

function latestMetricValue(result: MetricDataResult | undefined): number | null {
  const values = result?.Values;
  if (!values || values.length === 0) {
    return null;
  }
  return values[values.length - 1] ?? null;
}

export async function collectEc2MonitoringSnapshot(): Promise<Ec2MonitoringSnapshot> {
  const { AWS_EC2_INSTANCE_ID, AWS_EC2_PRIVATE_IP } = getEnv();
  const ec2 = getEc2Client();

  const describeResponse = await ec2.send(new DescribeInstancesCommand({}));
  const instances =
    describeResponse.Reservations?.flatMap((reservation) => reservation.Instances ?? []) ?? [];

  const instance = pickInstance(instances, AWS_EC2_INSTANCE_ID, AWS_EC2_PRIVATE_IP);
  const instanceId = instance.InstanceId ?? 'unknown';

  let systemStatus: string | null = null;
  let instanceStatus: string | null = null;

  if (instanceId !== 'unknown') {
    const statusResponse = await ec2.send(
      new DescribeInstanceStatusCommand({
        InstanceIds: [instanceId],
        IncludeAllInstances: true,
      }),
    );
    const status = statusResponse.InstanceStatuses?.[0];
    systemStatus = status?.SystemStatus?.Status ?? null;
    instanceStatus = status?.InstanceStatus?.Status ?? null;
  }

  const [cpuUtilizationPercent, networkInBytes, networkOutBytes] = await Promise.all([
    fetchLatestMetric(instanceId, 'CPUUtilization'),
    fetchLatestMetric(instanceId, 'NetworkIn'),
    fetchLatestMetric(instanceId, 'NetworkOut'),
  ]);

  return {
    instanceId,
    instanceName: getInstanceName(instance),
    state: instance.State?.Name ?? 'unknown',
    systemStatus,
    instanceStatus,
    cpuUtilizationPercent,
    networkInBytes,
    networkOutBytes,
    launchTime: instance.LaunchTime?.toISOString() ?? null,
    privateIp: instance.PrivateIpAddress ?? null,
    publicIp: instance.PublicIpAddress ?? null,
  };
}
