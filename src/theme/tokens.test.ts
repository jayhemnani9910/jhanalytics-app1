import { describe, it, expect } from 'vitest';
import { THEME_TOKENS, fontScaleFor } from './tokens';

describe('theme tokens', () => {
  it('has light and dark with the same keys', () => {
    expect(Object.keys(THEME_TOKENS.light).sort()).toEqual(Object.keys(THEME_TOKENS.dark).sort());
  });
  it('light bg differs from dark bg', () => {
    expect(THEME_TOKENS.light['--bg']).not.toBe(THEME_TOKENS.dark['--bg']);
  });
  it('large scale is bigger than normal', () => {
    expect(fontScaleFor('large')).toBeGreaterThan(fontScaleFor('normal'));
  });
});
