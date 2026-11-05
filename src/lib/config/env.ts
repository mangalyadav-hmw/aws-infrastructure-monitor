import { z } from 'zod';

const envSchema = z.object({
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_EC2_INSTANCE_ID: z.string().optional(),
  AWS_EC2_PRIVATE_IP: z.string().default('172.31.9.87'),
  AWS_RDS_DB_IDENTIFIER: z.string().default('whibedev-db'),
  MONITORING_CACHE_TTL_SECONDS: z.coerce.number().int().min(10).max(300).default(45),
  MONITORING_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(5000).max(120000).default(30000),
  DASHBOARD_API_SECRET: z.string().optional(),
  SSH_HOST: z.string().optional(),
  SSH_PORT: z.coerce.number().int().min(1).max(65535).default(22),
  SSH_USERNAME: z.string().optional(),
  SSH_PRIVATE_KEY: z.string().optional(),
  SSH_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(15000),
  SSH_AGENT_URL: z.string().url().optional(),
  SSH_AGENT_SECRET: z.string().optional(),
  RDS_DATABASE_URL: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error('Invalid server environment configuration');
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}

export function resetEnvCacheForTests(): void {
  cachedEnv = null;
}
