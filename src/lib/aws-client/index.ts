import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { EC2Client } from '@aws-sdk/client-ec2';
import { RDSClient } from '@aws-sdk/client-rds';
import { getEnv } from '@/lib/config/env';

let ec2Client: EC2Client | null = null;
let rdsClient: RDSClient | null = null;
let cloudWatchClient: CloudWatchClient | null = null;

export function getEc2Client(): EC2Client {
  if (!ec2Client) {
    const { AWS_REGION } = getEnv();
    ec2Client = new EC2Client({ region: AWS_REGION });
  }
  return ec2Client;
}

export function getRdsClient(): RDSClient {
  if (!rdsClient) {
    const { AWS_REGION } = getEnv();
    rdsClient = new RDSClient({ region: AWS_REGION });
  }
  return rdsClient;
}

export function getCloudWatchClient(): CloudWatchClient {
  if (!cloudWatchClient) {
    const { AWS_REGION } = getEnv();
    cloudWatchClient = new CloudWatchClient({ region: AWS_REGION });
  }
  return cloudWatchClient;
}

export function resetAwsClientsForTests(): void {
  ec2Client = null;
  rdsClient = null;
  cloudWatchClient = null;
}
