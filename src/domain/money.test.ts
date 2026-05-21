import { describe, it, expect } from 'vitest';
import { orderTotal, orderBalance } from './money';
import type { Order } from '../types';

const baseItem = { itemId: 'i1', garmentType: 'Blouse', templateId: null, quantity: 1, measurements: [], status: 'pending' as const };
const order = (over: Partial<Order>): Order => ({
  id: 'o1', tokenNo: '1234', customerId: 'c1', deadline: '2026-06-01',
  items: [], photos: [], createdAt: 0, updatedAt: 0, ...over,
});

describe('orderTotal', () => {
  it('sums item prices, treating missing prices as 0', () => {
    const o = order({ items: [{ ...baseItem, price: 600 }, { ...baseItem, itemId: 'i2', price: 450 }, { ...baseItem, itemId: 'i3' }] });
    expect(orderTotal(o)).toBe(1050);
  });
  it('is 0 for no items', () => {
    expect(orderTotal(order({ items: [] }))).toBe(0);
  });
});

describe('orderBalance', () => {
  it('is total minus advance', () => {
    const o = order({ items: [{ ...baseItem, price: 1000 }], advancePaid: 300 });
    expect(orderBalance(o)).toBe(700);
  });
  it('treats missing advance as 0', () => {
    const o = order({ items: [{ ...baseItem, price: 1000 }] });
    expect(orderBalance(o)).toBe(1000);
  });
});
