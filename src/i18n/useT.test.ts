import { describe, it, expect } from 'vitest';
import { translate } from './useT';
import { en } from './en';
import { gu } from './gu';

describe('translate', () => {
  it('returns the string for the active language', () => {
    expect(translate('en', 'dashboard.overdue')).toBe('Overdue');
  });
  it('falls back to english when a gujarati key is missing', () => {
    expect(translate('gu', '__missing__')).toBe(translate('en', '__missing__'));
  });
  it('returns the key itself if missing in both', () => {
    expect(translate('en', 'totally.unknown.key')).toBe('totally.unknown.key');
  });
  it('has identical keys in en and gu catalogs', () => {
    const enKeys = Object.keys(en).filter(k => k !== '__missing__').sort();
    const guKeys = Object.keys(gu).filter(k => k !== '__missing__').sort();
    expect(enKeys).toEqual(guKeys);
  });
});
