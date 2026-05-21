import type { OrderItem, OrderStatus } from '../types';

export function orderStatusRollup(items: OrderItem[]): OrderStatus {
  if (items.length === 0) return 'pending';
  if (items.some((i) => i.status === 'pending')) return 'pending';
  if (items.every((i) => i.status === 'delivered')) return 'delivered';
  return 'ready';
}
