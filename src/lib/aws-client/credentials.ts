import { fromEnv } from '@aws-sdk/credential-providers';
import type { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { getEnv } from '@/lib/config/env';

const SETUP_HINT =
  'Configure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION (ap-south-1) in Vercel → Project → Settings → Environment Variables for Production, then redeploy. Use a read-only IAM user (see docs/IAM_POLICY.json).';

export function assertAwsCredentialsConfigured(): void {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(`AWS credentials are missing on the server. ${SETUP_HINT}`);
  }
}

export function getAwsCredentialProvider(): AwsCredentialIdentityProvider {
  assertAwsCredentialsConfigured();
  return fromEnv();
}

export function getAwsClientConfig(): { region: string; credentials: AwsCredentialIdentityProvider } {
  const { AWS_REGION } = getEnv();
  return {
    region: AWS_REGION,
    credentials: getAwsCredentialProvider(),
  };
}

export function normalizeAwsErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes('Could not load credentials') ||
    message.includes('AWS credentials are missing')
  ) {
    return `AWS credentials are not configured on the server. ${SETUP_HINT}`;
  }
  return message;
}
