import React from 'react';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';

export function ConnectionBadge() {
  const online = useStore((s) => s.online);
  const t = useT();

  if (online) {
    return null; // Don't clutter UI when online, or show a subtle micro-indicator
  }

  return (
    <div style={styles.badge} id="connection-badge">
      <span style={styles.dot}></span>
      <span>{t('common.offline')}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '12px',
    background: 'color-mix(in srgb, var(--danger) 20%, transparent)',
    border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
    color: 'var(--danger)',
    fontSize: 'calc(12px * var(--font-scale))',
    fontWeight: '600',
    letterSpacing: '0.3px',
    fontFamily: '"Inter", sans-serif',
    boxShadow: 'none',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--danger)',
  },
};
