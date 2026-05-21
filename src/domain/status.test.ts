import { describe, it, expect } from 'vitest';
import { orderStatusRollup, nextBulkStatus, setAllItemsStatus } from './status';
import type { OrderItem } from '../types';

const item = (status: OrderItem['status']): OrderItem => ({ itemId: 'x', garmentType: 'B', templateId: null, quantity: 1, measurements: [], status });

describe('orderStatusRollup', () => {
  it('is delivered only when all items delivered', () => {
    expect(orderStatusRollup([item('delivered'), item('delivered')])).toBe('delivered');
  });
  it('is ready when all ready (none pending, not all delivered)', () => {
    expect(orderStatusRollup([item('ready'), item('ready')])).toBe('ready');
  });
  it('is ready when mix of ready and delivered', () => {
    expect(orderStatusRollup([item('ready'), item('delivered')])).toBe('ready');
  });
  it('is pending when any item pending', () => {
    expect(orderStatusRollup([item('pending'), item('delivered')])).toBe('pending');
  });
  it('is pending for empty list', () => {
    expect(orderStatusRollup([])).toBe('pending');
  });
});

describe('nextBulkStatus', () => {
  it('pending advances to ready', () => { expect(nextBulkStatus('pending')).toBe('ready'); });
  it('ready advances to delivered', () => { expect(nextBulkStatus('ready')).toBe('delivered'); });
  it('delivered has no next', () => { expect(nextBulkStatus('delivered')).toBeNull(); });
});

describe('setAllItemsStatus', () => {
  it('sets every item to the given status', () => {
    const items = [
      { itemId: 'a', garmentType: 'X', templateId: null, quantity: 1, measurements: [], status: 'pending' as const },
      { itemId: 'b', garmentType: 'Y', templateId: null, quantity: 1, measurements: [], status: 'ready' as const },
    ];
    const out = setAllItemsStatus(items, 'delivered');
    expect(out.every((i) => i.status === 'delivered')).toBe(true);
    expect(out).not.toBe(items); // returns a new array
  });
});
