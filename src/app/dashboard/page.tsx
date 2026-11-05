import type { ReactNode } from 'react';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { ThemeProvider } from '@/components/dashboard/theme-provider';

export default function DashboardPage(): ReactNode {
  return (
    <ThemeProvider>
      <DashboardView />
    </ThemeProvider>
  );
}
