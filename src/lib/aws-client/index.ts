import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { EC2Client } from '@aws-sdk/client-ec2';
import { RDSClient } from '@aws-sdk/client-rds';
import { getAwsClientConfig } from '@/lib/aws-client/credentials';

let ec2Client: EC2Client | null = null;
let rdsClient: RDSClient | null = null;
let cloudWatchClient: CloudWatchClient | null = null;

export function getEc2Client(): EC2Client {
  if (!ec2Client) {
    ec2Client = new EC2Client(getAwsClientConfig());
  }
  return ec2Client;
}

export function getRdsClient(): RDSClient {
  if (!rdsClient) {
    rdsClient = new RDSClient(getAwsClientConfig());
  }
  return rdsClient;
}

export function getCloudWatchClient(): CloudWatchClient {
  if (!cloudWatchClient) {
    cloudWatchClient = new CloudWatchClient(getAwsClientConfig());
  }
  return cloudWatchClient;
}

export function resetAwsClientsForTests(): void {
  ec2Client = null;
  rdsClient = null;
  cloudWatchClient = null;
}
