import { THEME_TOKENS, fontScaleFor, type ThemeName, type TextScale } from './tokens';

export function applyTheme(theme: ThemeName = 'dark', scale: TextScale = 'normal') {
  const root = document.documentElement;
  const tokens = THEME_TOKENS[theme];
  for (const [k, v] of Object.entries(tokens)) {
    root.style.setProperty(k, v);
  }
  root.style.setProperty('--font-scale', String(fontScaleFor(scale)));
}
