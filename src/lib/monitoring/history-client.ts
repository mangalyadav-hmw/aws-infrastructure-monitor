'use client';

import type { InfrastructureOverview } from '@/lib/monitoring/types';

const HISTORY_KEY = 'aim-monitoring-history';
const MAX_POINTS = 48;

export interface HistoryPoint {
  timestamp: string;
  ec2Cpu: number | null;
  rdsCpu: number | null;
  sshCpu: number | null;
  overallHealth: InfrastructureOverview['overallHealth'];
}

export function appendHistoryPoint(overview: InfrastructureOverview): HistoryPoint[] {
  const point: HistoryPoint = {
    timestamp: new Date().toISOString(),
    ec2Cpu: overview.ec2.cpuUtilizationPercent,
    rdsCpu: overview.rds.cpuUtilizationPercent,
    sshCpu: overview.ssh.cpuUsagePercent,
    overallHealth: overview.overallHealth,
  };

  const existing = readHistory();
  const next = [...existing, point].slice(-MAX_POINTS);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function readHistory(): HistoryPoint[] {
  if (typeof window === 'undefined') {
    return [];
  }
  const raw = window.localStorage.getItem(HISTORY_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as HistoryPoint[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
