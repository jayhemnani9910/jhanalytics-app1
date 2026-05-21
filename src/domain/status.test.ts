import { describe, it, expect } from 'vitest';
import { orderStatusRollup } from './status';
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
