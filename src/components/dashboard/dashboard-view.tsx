'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Moon, RefreshCw, Sun } from 'lucide-react';
import { MonitoringHistoryChart } from '@/components/charts/monitoring-history-chart';
import { useTheme } from '@/components/dashboard/theme-provider';
import { MetricRow, MonitoringCard, StatusBadge } from '@/components/monitoring/monitoring-card';
import { appendHistoryPoint, readHistory, type HistoryPoint } from '@/lib/monitoring/history-client';
import type { InfrastructureOverview } from '@/lib/monitoring/types';
import { formatBytes, formatDateTime, formatPercent } from '@/lib/utils';

const REFRESH_MS = 45_000;

function healthTone(
  health: InfrastructureOverview['overallHealth'],
): 'healthy' | 'degraded' | 'critical' | 'unknown' {
  return health;
}

export function DashboardView(): ReactNode {
  const { theme, toggleTheme } = useTheme();
  const [overview, setOverview] = useState<InfrastructureOverview | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const fetchOverview = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    setError(null);

    try {
      const response = await fetch('/api/monitoring/overview', { cache: 'no-store' });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'Monitoring request failed');
      }
      const payload = (await response.json()) as InfrastructureOverview;
      setOverview(payload);
      setHistory(appendHistoryPoint(payload));
      setLastRefresh(new Date().toISOString());
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : 'Unable to refresh monitoring data';
      setError(message);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    setHistory(readHistory());
    void fetchOverview();
    const timer = window.setInterval(() => {
      void fetchOverview();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [fetchOverview]);

  const ec2Tone = useMemo(() => {
    if (!overview || overview.ec2.stale) return 'degraded';
    if (overview.ec2.state !== 'running') return 'critical';
    if (overview.ec2.systemStatus !== 'ok' || overview.ec2.instanceStatus !== 'ok') {
      return 'degraded';
    }
    return 'healthy';
  }, [overview]);

  const rdsTone = useMemo(() => {
    if (!overview || overview.rds.stale) return 'degraded';
    if (overview.rds.health === 'healthy') return 'healthy';
    if (overview.rds.health === 'degraded') return 'degraded';
    return 'unknown';
  }, [overview]);

  const sshTone = useMemo(() => {
    if (!overview || overview.ssh.stale) return 'degraded';
    return overview.ssh.connected ? 'healthy' : 'critical';
  }, [overview]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              AWS Infrastructure Monitoring
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">Operations Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            {overview ? (
              <StatusBadge label={`Overall: ${overview.overallHealth}`} tone={healthTone(overview.overallHealth)} />
            ) : null}
            <button
              type="button"
              onClick={() => void fetchOverview()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center rounded-xl border border-slate-200 p-2 dark:border-slate-700"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              Last refresh: <strong>{formatDateTime(lastRefresh)}</strong>
            </span>
            <span>Auto refresh: every 45 seconds</span>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-950/40 p-4 text-sm text-rose-100 dark:bg-rose-950/60">
            <p className="font-medium text-rose-200">Monitoring error</p>
            <p className="mt-2 whitespace-pre-wrap text-rose-100/95">{error}</p>
            {error.includes('AWS credentials') ? (
              <p className="mt-3 text-rose-200/90">
                Vercel: Project → Settings → Environment Variables → add{' '}
                <code className="rounded bg-black/20 px-1">AWS_ACCESS_KEY_ID</code>,{' '}
                <code className="rounded bg-black/20 px-1">AWS_SECRET_ACCESS_KEY</code>, and{' '}
                <code className="rounded bg-black/20 px-1">AWS_REGION</code>, then Redeploy.
              </p>
            ) : null}
          </div>
        ) : null}

        {loading && !overview ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
            Loading monitoring data…
          </div>
        ) : null}

        {overview ? (
          <>
            <div className="grid gap-6 xl:grid-cols-3">
              <MonitoringCard
                title="EC2 Monitoring"
                subtitle={overview.ec2.instanceName ?? overview.ec2.instanceId}
                tone={ec2Tone}
                statusLabel={overview.ec2.state}
                footer={
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Last successful check: {formatDateTime(overview.ec2.lastSuccessfulCheck)}
                    {overview.ec2.stale ? ' (stale cached data)' : ''}
                    {overview.ec2.error ? ` — ${overview.ec2.error}` : ''}
                  </p>
                }
              >
                <MetricRow label="Instance ID" value={overview.ec2.instanceId} />
                <MetricRow label="System status" value={overview.ec2.systemStatus} />
                <MetricRow label="Instance status" value={overview.ec2.instanceStatus} />
                <MetricRow label="CPU utilization" value={formatPercent(overview.ec2.cpuUtilizationPercent)} />
                <MetricRow label="Network in" value={formatBytes(overview.ec2.networkInBytes)} />
                <MetricRow label="Network out" value={formatBytes(overview.ec2.networkOutBytes)} />
                <MetricRow label="Launch time" value={formatDateTime(overview.ec2.launchTime)} />
                <MetricRow label="Private IP" value={overview.ec2.privateIp} />
              </MonitoringCard>

              <MonitoringCard
                title="RDS Monitoring"
                subtitle={overview.rds.endpoint ?? overview.rds.dbInstanceIdentifier}
                tone={rdsTone}
                statusLabel={overview.rds.status ?? 'unknown'}
                footer={
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Last successful check: {formatDateTime(overview.rds.lastSuccessfulCheck)}
                    {overview.rds.stale ? ' (stale cached data)' : ''}
                    {overview.rds.error ? ` — ${overview.rds.error}` : ''}
                  </p>
                }
              >
                <MetricRow label="DB identifier" value={overview.rds.dbInstanceIdentifier} />
                <MetricRow label="Engine" value={`${overview.rds.engine ?? '—'} ${overview.rds.engineVersion ?? ''}`} />
                <MetricRow label="Availability" value={overview.rds.availability} />
                <MetricRow label="Health" value={overview.rds.health} />
                <MetricRow label="CPU utilization" value={formatPercent(overview.rds.cpuUtilizationPercent)} />
                <MetricRow label="Free storage" value={formatBytes(overview.rds.freeStorageBytes)} />
                <MetricRow label="Connections" value={overview.rds.databaseConnections} />
              </MonitoringCard>

              <MonitoringCard
                title="SSH Monitoring"
                subtitle={overview.ssh.hostname ?? 'Ubuntu server'}
                tone={sshTone}
                statusLabel={overview.ssh.connected ? 'Connected' : 'Disconnected'}
                footer={
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Last successful connection: {formatDateTime(overview.ssh.lastSuccessfulConnection)}
                    {overview.ssh.stale ? ' (stale cached data)' : ''}
                    {overview.ssh.connectionError ? ` — ${overview.ssh.connectionError}` : ''}
                  </p>
                }
              >
                <MetricRow label="Hostname" value={overview.ssh.hostname} />
                <MetricRow label="Uptime" value={overview.ssh.uptime} />
                <MetricRow label="Operating system" value={overview.ssh.operatingSystem} />
                <MetricRow label="CPU usage" value={formatPercent(overview.ssh.cpuUsagePercent)} />
                <MetricRow label="Memory usage" value={formatPercent(overview.ssh.memoryUsagePercent)} />
                <MetricRow label="Disk usage" value={formatPercent(overview.ssh.diskUsagePercent)} />
              </MonitoringCard>
            </div>

            <MonitoringHistoryChart data={history} />
          </>
        ) : null}
      </main>
    </div>
  );
}
