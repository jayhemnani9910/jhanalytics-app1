import { describe, it, expect } from 'vitest';
import { rowsFromTemplate, prefillRows } from './measurements';
import type { Template, Order } from '../types';

const template: Template = {
  id: 't1', name: 'Blouse', isDefault: true, createdAt: 0,
  fields: [
    { id: 'f1', label: 'Shoulder', unit: 'in' },
    { id: 'f2', label: 'Waist', unit: 'in' },
  ],
};

describe('rowsFromTemplate', () => {
  it('creates one empty row per field, snapshotting label and unit', () => {
    const rows = rowsFromTemplate(template);
    expect(rows).toEqual([
      { fieldId: 'f1', label: 'Shoulder', value: '', unit: 'in' },
      { fieldId: 'f2', label: 'Waist', value: '', unit: 'in' },
    ]);
  });
});

describe('prefillRows', () => {
  it('returns rows from the customer\'s most recent matching item, by templateId', () => {
    const orders: Order[] = [
      { id: 'o1', tokenNo: '1', customerId: 'c1', deadline: '2026-01-01', photos: [], createdAt: 10, updatedAt: 10,
        items: [{ itemId: 'i1', garmentType: 'Blouse', templateId: 't1', quantity: 1, status: 'delivered',
          measurements: [{ fieldId: 'f1', label: 'Shoulder', value: '14', unit: 'in' }, { fieldId: 'f2', label: 'Waist', value: '30', unit: 'in' }] }] },
      { id: 'o2', tokenNo: '2', customerId: 'c1', deadline: '2026-03-01', photos: [], createdAt: 99, updatedAt: 99,
        items: [{ itemId: 'i2', garmentType: 'Blouse', templateId: 't1', quantity: 1, status: 'delivered',
          measurements: [{ fieldId: 'f1', label: 'Shoulder', value: '15', unit: 'in' }, { fieldId: 'f2', label: 'Waist', value: '31', unit: 'in' }] }] },
    ];
    const rows = prefillRows(orders, 't1', template);
    expect(rows?.find((r) => r.fieldId === 'f1')?.value).toBe('15'); // from the newer order (createdAt 99)
  });
  it('returns null when no matching history', () => {
    expect(prefillRows([], 't1', template)).toBeNull();
  });
});
