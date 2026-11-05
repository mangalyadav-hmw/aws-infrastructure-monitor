import { getEnv } from '@/lib/config/env';
import type { SshMonitoringSnapshot } from '@/lib/monitoring/types';
import { parseSshHealthOutput } from '@/services/ssh/ssh-health-script';

interface AgentHealthPayload {
  hostname: string;
  uptime: string;
  operatingSystem: string;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  diskUsagePercent: number;
}

export async function collectSshViaAgent(
  lastSuccessfulConnection: string | null,
): Promise<{ snapshot: SshMonitoringSnapshot; lastSuccessfulConnection: string | null }> {
  const { SSH_AGENT_URL, SSH_AGENT_SECRET, SSH_CONNECT_TIMEOUT_MS, AWS_EC2_PRIVATE_IP } =
    getEnv();

  if (!SSH_AGENT_URL) {
    return {
      snapshot: {
        connected: false,
        hostname: AWS_EC2_PRIVATE_IP,
        uptime: null,
        operatingSystem: null,
        cpuUsagePercent: null,
        memoryUsagePercent: null,
        diskUsagePercent: null,
        lastSuccessfulConnection,
        connectionError:
          'SSH agent URL is not configured. Deploy the optional on-host agent for Vercel.',
      },
      lastSuccessfulConnection,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SSH_CONNECT_TIMEOUT_MS);

  try {
    const response = await fetch(`${SSH_AGENT_URL.replace(/\/$/, '')}/health`, {
      method: 'GET',
      headers: SSH_AGENT_SECRET ? { 'x-agent-secret': SSH_AGENT_SECRET } : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('SSH agent health request failed');
    }

    const payload = (await response.json()) as AgentHealthPayload;
    const parsed = parseSshHealthOutput(
      [
        payload.hostname,
        payload.uptime,
        payload.operatingSystem,
        String(payload.cpuUsagePercent),
        String(payload.memoryUsagePercent),
        String(payload.diskUsagePercent),
      ].join('\n'),
    );

    const checkedAt = new Date().toISOString();
    return {
      lastSuccessfulConnection: checkedAt,
      snapshot: {
        connected: true,
        hostname: parsed.hostname,
        uptime: parsed.uptime,
        operatingSystem: parsed.operatingSystem,
        cpuUsagePercent: parsed.cpuUsagePercent,
        memoryUsagePercent: parsed.memoryUsagePercent,
        diskUsagePercent: parsed.diskUsagePercent,
        lastSuccessfulConnection: checkedAt,
        connectionError: null,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SSH agent request failed';
    return {
      lastSuccessfulConnection,
      snapshot: {
        connected: false,
        hostname: AWS_EC2_PRIVATE_IP,
        uptime: null,
        operatingSystem: null,
        cpuUsagePercent: null,
        memoryUsagePercent: null,
        diskUsagePercent: null,
        lastSuccessfulConnection,
        connectionError: message,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
