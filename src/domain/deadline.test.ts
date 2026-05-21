import { describe, it, expect } from 'vitest';
import { deadlineBucket, DUE_SOON_DAYS } from './deadline';

// today is fixed as 2026-06-01 for these tests
const today = '2026-06-01';

describe('deadlineBucket', () => {
  it('overdue when before today and not delivered', () => {
    expect(deadlineBucket('2026-05-30', today, 'pending')).toBe('overdue');
  });
  it('due-soon when within DUE_SOON_DAYS inclusive and not delivered', () => {
    expect(deadlineBucket('2026-06-01', today, 'pending')).toBe('due-soon');
    expect(deadlineBucket('2026-06-04', today, 'ready')).toBe('due-soon'); // +3 days
  });
  it('upcoming when beyond the window', () => {
    expect(deadlineBucket('2026-06-05', today, 'pending')).toBe('upcoming');
  });
  it('delivered orders are never overdue or due-soon (treated as upcoming/none)', () => {
    expect(deadlineBucket('2026-05-30', today, 'delivered')).toBe('upcoming');
  });
  it('DUE_SOON_DAYS is 3', () => {
    expect(DUE_SOON_DAYS).toBe(3);
  });
});
