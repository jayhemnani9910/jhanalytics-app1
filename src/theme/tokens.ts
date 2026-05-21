export type ThemeName = 'dark' | 'light';
export type TextScale = 'normal' | 'large';

export const THEME_TOKENS: Record<ThemeName, Record<string, string>> = {
  dark: {
    '--bg': '#111827',
    '--surface': 'rgba(255, 255, 255, 0.05)',
    '--surface-2': 'rgba(255, 255, 255, 0.02)',
    '--text': '#ffffff',
    '--text-muted': '#9ca3af',
    '--border': 'rgba(255, 255, 255, 0.1)',
    '--accent': '#3b82f6',
    '--danger': '#ef4444',
    '--warning': '#f59e0b',
    '--success': '#10b981',
  },
  light: {
    '--bg': '#f5f6f8',
    '--surface': '#ffffff',
    '--surface-2': '#f0f1f4',
    '--text': '#111827',
    '--text-muted': '#4b5563',
    '--border': 'rgba(0, 0, 0, 0.12)',
    '--accent': '#2563eb',
    '--danger': '#dc2626',
    '--warning': '#b45309',
    '--success': '#047857',
  },
};

export function fontScaleFor(scale: TextScale): number {
  return scale === 'large' ? 1.18 : 1.0;
}
