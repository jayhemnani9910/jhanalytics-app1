import type { OrderItem, OrderStatus } from '../types';

export function orderStatusRollup(items: OrderItem[]): OrderStatus {
  if (items.length === 0) return 'pending';
  if (items.some((i) => i.status === 'pending')) return 'pending';
  if (items.every((i) => i.status === 'delivered')) return 'delivered';
  return 'ready';
}

export function nextBulkStatus(rollup: OrderStatus): OrderStatus | null {
  if (rollup === 'pending') return 'ready';
  if (rollup === 'ready') return 'delivered';
  return null;
}

export function setAllItemsStatus(items: OrderItem[], status: OrderStatus): OrderItem[] {
  return items.map((i) => ({ ...i, status }));
}
