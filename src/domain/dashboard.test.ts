import { describe, it, expect } from 'vitest';
import { bucketOrders } from './dashboard';
import type { Order } from '../types';

const baseItem = (status: 'pending' | 'ready' | 'delivered', price = 500) => ({
  itemId: crypto.randomUUID(),
  garmentType: 'Blouse',
  templateId: null,
  quantity: 1,
  measurements: [],
  price,
  status,
});

const makeOrder = (over: Partial<Order>): Order => ({
  id: crypto.randomUUID(),
  tokenNo: '1111',
  customerId: 'cust-1',
  deadline: '2026-06-01',
  items: [baseItem('pending')],
  photos: [],
  createdAt: 1000,
  updatedAt: 1000,
  ...over,
});

describe('bucketOrders', () => {
  const today = '2026-06-01';

  it('correctly buckets overdue orders', () => {
    const overdueOrder = makeOrder({ deadline: '2026-05-30', items: [baseItem('pending')] });
    const deliveredOverdueOrder = makeOrder({ deadline: '2026-05-30', items: [baseItem('delivered')] });

    const buckets = bucketOrders([overdueOrder, deliveredOverdueOrder], today);
    expect(buckets.overdue).toContainEqual(overdueOrder);
    expect(buckets.overdue).not.toContainEqual(deliveredOverdueOrder);
  });

  it('correctly buckets due soon orders', () => {
    const dueToday = makeOrder({ deadline: '2026-06-01', items: [baseItem('pending')] });
    const dueIn3Days = makeOrder({ deadline: '2026-06-04', items: [baseItem('pending')] });
    const dueIn4Days = makeOrder({ deadline: '2026-06-05', items: [baseItem('pending')] });

    const buckets = bucketOrders([dueToday, dueIn3Days, dueIn4Days], today);
    expect(buckets.dueSoon).toContainEqual(dueToday);
    expect(buckets.dueSoon).toContainEqual(dueIn3Days);
    expect(buckets.dueSoon).not.toContainEqual(dueIn4Days);
  });

  it('correctly buckets ready for pickup orders', () => {
    const readyOrder = makeOrder({ items: [baseItem('ready')] });
    const pendingOrder = makeOrder({ items: [baseItem('pending')] });

    const buckets = bucketOrders([readyOrder, pendingOrder], today);
    expect(buckets.ready).toContainEqual(readyOrder);
    expect(buckets.ready).not.toContainEqual(pendingOrder);
  });

  it('correctly buckets balance due orders', () => {
    const paidOrder = makeOrder({ items: [baseItem('pending', 500)], advancePaid: 500 });
    const unpaidOrder = makeOrder({ items: [baseItem('pending', 500)], advancePaid: 200 });

    const buckets = bucketOrders([paidOrder, unpaidOrder], today);
    expect(buckets.balanceDue).toContainEqual(unpaidOrder);
    expect(buckets.balanceDue).not.toContainEqual(paidOrder);
  });

  it('correctly sorts recent orders by createdAt descending and caps at 10', () => {
    const orders = Array.from({ length: 12 }, (_, i) => 
      makeOrder({ createdAt: 1000 + i, tokenNo: `T${i}` })
    );

    const buckets = bucketOrders(orders, today);
    expect(buckets.recent.length).toBe(10);
    expect(buckets.recent[0].tokenNo).toBe('T11');
    expect(buckets.recent[9].tokenNo).toBe('T2');
  });
});
