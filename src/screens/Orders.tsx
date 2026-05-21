import React from 'react';
import { useT } from '../i18n/useT';

export function Orders() {
  const t = useT();
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>{t('nav.orders')}</h1>
        <p style={styles.text}>Orders screen content will be placed here.</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px 16px 88px 16px',
    minHeight: '100vh',
    background: 'radial-gradient(circle at top right, #1f2937, #111827)',
    color: '#ffffff',
    fontFamily: '"Inter", sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: '500px',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
    boxSizing: 'border-box',
    marginTop: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    margin: '0 0 12px 0',
  },
  text: {
    fontSize: '14px',
    color: '#9ca3af',
    lineHeight: '1.5',
    margin: 0,
  },
};
