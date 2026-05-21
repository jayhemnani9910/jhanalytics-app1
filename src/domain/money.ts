import type { Order } from '../types';

export function orderTotal(order: Order): number {
  return order.items.reduce((sum, item) => sum + (item.price ?? 0), 0);
}

export function orderBalance(order: Order): number {
  return orderTotal(order) - (order.advancePaid ?? 0);
}
