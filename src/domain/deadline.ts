import type { DeadlineBucket, OrderStatus } from '../types';

export const DUE_SOON_DAYS = 3;

// Parse a YYYY-MM-DD string to a UTC-midnight epoch day count to avoid timezone drift.
function toDayNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function deadlineBucket(deadline: string, today: string, rollup: OrderStatus): DeadlineBucket {
  if (rollup === 'delivered') return 'upcoming';
  const diff = toDayNumber(deadline) - toDayNumber(today);
  if (diff < 0) return 'overdue';
  if (diff <= DUE_SOON_DAYS) return 'due-soon';
  return 'upcoming';
}

// Helper for callers: today's local date as YYYY-MM-DD.
export function todayStr(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
