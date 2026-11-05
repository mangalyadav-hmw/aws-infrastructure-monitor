export interface MonitoringMeta {
  lastSuccessfulCheck: string | null;
  checkedAt: string;
  stale: boolean;
  fromCache: boolean;
  error: string | null;
}

export interface Ec2MonitoringSnapshot {
  instanceId: string;
  instanceName: string | null;
  state: string;
  systemStatus: string | null;
  instanceStatus: string | null;
  cpuUtilizationPercent: number | null;
  networkInBytes: number | null;
  networkOutBytes: number | null;
  launchTime: string | null;
  privateIp: string | null;
  publicIp: string | null;
}

export interface RdsMonitoringSnapshot {
  dbInstanceIdentifier: string;
  engine: string | null;
  engineVersion: string | null;
  status: string | null;
  availability: 'available' | 'unavailable' | 'unknown';
  cpuUtilizationPercent: number | null;
  freeStorageBytes: number | null;
  databaseConnections: number | null;
  endpoint: string | null;
  health: 'healthy' | 'degraded' | 'unknown';
}

export interface SshMonitoringSnapshot {
  connected: boolean;
  hostname: string | null;
  uptime: string | null;
  operatingSystem: string | null;
  cpuUsagePercent: number | null;
  memoryUsagePercent: number | null;
  diskUsagePercent: number | null;
  lastSuccessfulConnection: string | null;
  connectionError: string | null;
}

export interface InfrastructureOverview {
  ec2: Ec2MonitoringSnapshot & MonitoringMeta;
  rds: RdsMonitoringSnapshot & MonitoringMeta;
  ssh: SshMonitoringSnapshot & MonitoringMeta;
  overallHealth: 'healthy' | 'degraded' | 'critical' | 'unknown';
}
