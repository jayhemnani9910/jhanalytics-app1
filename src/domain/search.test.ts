import { describe, it, expect } from 'vitest';
import { matchesQuery } from './search';

describe('matchesQuery', () => {
  it('matches partial name case-insensitively', () => {
    expect(matchesQuery({ name: 'Meena', phone: '98765', token: '4821' }, 'een')).toBe(true);
  });
  it('matches phone fragment', () => {
    expect(matchesQuery({ name: 'Meena', phone: '9876543210', token: '4821' }, '654')).toBe(true);
  });
  it('matches token', () => {
    expect(matchesQuery({ name: 'Meena', phone: '', token: '4821' }, '4821')).toBe(true);
  });
  it('empty query matches everything', () => {
    expect(matchesQuery({ name: 'X', phone: '', token: '' }, '')).toBe(true);
  });
  it('no match returns false', () => {
    expect(matchesQuery({ name: 'Meena', phone: '12', token: '99' }, 'zzz')).toBe(false);
  });
});
