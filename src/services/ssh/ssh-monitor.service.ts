import { Client } from 'ssh2';
import { getEnv } from '@/lib/config/env';
import type { SshMonitoringSnapshot } from '@/lib/monitoring/types';
import { getReadOnlyHealthScript, parseSshHealthOutput } from '@/services/ssh/ssh-health-script';
import { collectSshViaAgent } from '@/services/ssh/ssh-agent-client.service';

let lastSuccessfulConnection: string | null = null;

export function getLastSuccessfulSshConnection(): string | null {
  return lastSuccessfulConnection;
}

export function resetSshMonitorStateForTests(): void {
  lastSuccessfulConnection = null;
}

function executeReadOnlyHealthCheck(
  host: string,
  port: number,
  username: string,
  privateKey: string,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new Client();
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        client.end();
        reject(new Error('SSH connection timed out'));
      }
    }, timeoutMs);

    client
      .on('ready', () => {
        client.exec(getReadOnlyHealthScript(), (error, stream) => {
          if (error) {
            clearTimeout(timer);
            settled = true;
            client.end();
            reject(error);
            return;
          }

          let stdout = '';
          stream
            .on('data', (chunk: Buffer) => {
              stdout += chunk.toString('utf8');
            })
            .stderr.on('data', () => {
              /* ignore stderr for health script */
            });

          stream.on('close', (code: number | null) => {
            clearTimeout(timer);
            settled = true;
            client.end();
            if (code !== 0) {
              reject(new Error('SSH health script failed'));
              return;
            }
            resolve(stdout);
          });
        });
      })
      .on('error', (error) => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          reject(error);
        }
      })
      .connect({
        host,
        port,
        username,
        privateKey,
        readyTimeout: timeoutMs,
      });
  });
}

export async function collectSshMonitoringSnapshot(): Promise<SshMonitoringSnapshot> {
  const {
    SSH_HOST,
    SSH_PORT,
    SSH_USERNAME,
    SSH_PRIVATE_KEY,
    SSH_CONNECT_TIMEOUT_MS,
    AWS_EC2_PRIVATE_IP,
    SSH_AGENT_URL,
  } = getEnv();

  const host = SSH_HOST ?? AWS_EC2_PRIVATE_IP;
  const username = SSH_USERNAME;
  const privateKey = SSH_PRIVATE_KEY;

  if (SSH_AGENT_URL) {
    const agentResult = await collectSshViaAgent(lastSuccessfulConnection);
    lastSuccessfulConnection = agentResult.lastSuccessfulConnection;
    return agentResult.snapshot;
  }

  if (!username || !privateKey) {
    return {
      connected: false,
      hostname: host,
      uptime: null,
      operatingSystem: null,
      cpuUsagePercent: null,
      memoryUsagePercent: null,
      diskUsagePercent: null,
      lastSuccessfulConnection,
      connectionError:
        'SSH monitoring is not configured. Set SSH_USERNAME and SSH_PRIVATE_KEY server-side.',
    };
  }

  try {
    const output = await executeReadOnlyHealthCheck(
      host,
      SSH_PORT,
      username,
      privateKey.replace(/\\n/g, '\n'),
      SSH_CONNECT_TIMEOUT_MS,
    );
    const parsed = parseSshHealthOutput(output);
    lastSuccessfulConnection = new Date().toISOString();

    return {
      connected: true,
      hostname: parsed.hostname,
      uptime: parsed.uptime,
      operatingSystem: parsed.operatingSystem,
      cpuUsagePercent: parsed.cpuUsagePercent,
      memoryUsagePercent: parsed.memoryUsagePercent,
      diskUsagePercent: parsed.diskUsagePercent,
      lastSuccessfulConnection,
      connectionError: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SSH connection failed';
    return {
      connected: false,
      hostname: host,
      uptime: null,
      operatingSystem: null,
      cpuUsagePercent: null,
      memoryUsagePercent: null,
      diskUsagePercent: null,
      lastSuccessfulConnection,
      connectionError: message,
    };
  }
}
