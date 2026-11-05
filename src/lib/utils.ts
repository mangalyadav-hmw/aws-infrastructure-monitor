export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function formatBytes(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(1)}%`;
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString();
}
