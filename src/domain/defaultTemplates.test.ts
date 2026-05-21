import { describe, it, expect } from 'vitest';
import { DEFAULT_TEMPLATES } from './defaultTemplates';

describe('DEFAULT_TEMPLATES', () => {
  it('has the six starter garments', () => {
    expect(DEFAULT_TEMPLATES.map((t) => t.name)).toEqual([
      'Blouse', 'Kameez / Kurti', 'Salwar / Churidar', 'Dress / Gown', 'Shirt', 'Pant / Trouser',
    ]);
  });
  it('every field has a non-empty label and unit', () => {
    for (const t of DEFAULT_TEMPLATES) {
      for (const f of t.fields) {
        expect(f.label.length).toBeGreaterThan(0);
        expect(f.unit.length).toBeGreaterThan(0);
      }
    }
  });
});
