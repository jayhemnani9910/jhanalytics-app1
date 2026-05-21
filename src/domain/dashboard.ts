import type { Order } from '../types';
import { orderStatusRollup } from './status';
import { deadlineBucket, todayStr } from './deadline';
import { orderBalance } from './money';

export interface DashboardBuckets {
  overdue: Order[];
  dueSoon: Order[];
  ready: Order[];
  balanceDue: Order[];
  recent: Order[];
}

export function bucketOrders(orders: Order[], today: string = todayStr()): DashboardBuckets {
  const overdue: Order[] = [];
  const dueSoon: Order[] = [];
  const ready: Order[] = [];
  const balanceDue: Order[] = [];

  // Filter active and bucket them
  for (const order of orders) {
    const status = orderStatusRollup(order.items);
    if (status !== 'delivered') {
      const bucket = deadlineBucket(order.deadline, today, status);
      if (bucket === 'overdue') {
        overdue.push(order);
      } else if (bucket === 'due-soon') {
        dueSoon.push(order);
      }
      
      if (status === 'ready') {
        ready.push(order);
      }
    }

    if (orderBalance(order) > 0) {
      balanceDue.push(order);
    }
  }

  // Sort buckets by deadline ascending (closest first)
  const sortByDeadline = (a: Order, b: Order) => a.deadline.localeCompare(b.deadline);
  overdue.sort(sortByDeadline);
  dueSoon.sort(sortByDeadline);
  ready.sort(sortByDeadline);
  balanceDue.sort(sortByDeadline);

  // Recent is latest 10 orders, sorted by createdAt descending
  const recent = [...orders]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10);

  return {
    overdue,
    dueSoon,
    ready,
    balanceDue,
    recent,
  };
}
