import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type HealthTone = 'healthy' | 'degraded' | 'critical' | 'unknown' | 'offline';

const toneStyles: Record<HealthTone, string> = {
  healthy: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
  degraded: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  critical: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  unknown: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
  offline: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
};

export function StatusBadge({ label, tone }: { label: string; tone: HealthTone }): ReactNode {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        toneStyles[tone],
      )}
    >
      {label}
    </span>
  );
}

export function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}): ReactNode {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-900 dark:text-slate-100">
        {value === null || value === undefined || value === '' ? '—' : value}
      </span>
    </div>
  );
}

export function MonitoringCard({
  title,
  subtitle,
  tone,
  statusLabel,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  tone: HealthTone;
  statusLabel: string;
  children: ReactNode;
  footer?: ReactNode;
}): ReactNode {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          ) : null}
        </div>
        <StatusBadge label={statusLabel} tone={tone} />
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">{children}</div>
      {footer ? (
        <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">{footer}</div>
      ) : null}
    </section>
  );
}
