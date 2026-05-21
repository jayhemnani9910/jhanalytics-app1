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
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.3px',
    fontFamily: '"Inter", sans-serif',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#ef4444',
  },
};
