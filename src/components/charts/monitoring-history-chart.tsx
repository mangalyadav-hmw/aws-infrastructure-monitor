import type { ReactNode } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HistoryPoint } from '@/lib/monitoring/history-client';

export function MonitoringHistoryChart({ data }: { data: HistoryPoint[] }): ReactNode {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Monitoring history will appear after the first few refresh cycles.
      </div>
    );
  }

  const chartData = data.map((point) => ({
    ...point,
    label: new Date(point.timestamp).toLocaleTimeString(),
  }));

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-50">
        Monitoring history
      </h2>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="ec2Cpu" name="EC2 CPU %" stroke="#22c55e" dot={false} />
            <Line type="monotone" dataKey="rdsCpu" name="RDS CPU %" stroke="#3b82f6" dot={false} />
            <Line type="monotone" dataKey="sshCpu" name="SSH CPU %" stroke="#f97316" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
