import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useStore } from '../store/useStore';
import { Login } from '../screens/Login';
import { ensureSeeded } from '../firebase/seed';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (user) {
      const unsub = useStore.getState().init();
      ensureSeeded().catch((err) => console.error('Database seeding failed:', err));
      return unsub;
    }
  }, [user]);

  if (user === undefined) {
    return (
      <div style={styles.splash}>
        <div style={styles.spinner}></div>
        <div style={styles.text}>Loading Tailor App...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <>{children}</>;
}

const styles: Record<string, React.CSSProperties> = {
  splash: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'radial-gradient(circle at top right, #1f2937, #111827)',
    color: '#ffffff',
    fontFamily: '"Inter", sans-serif',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTop: '3px solid #a855f7',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  text: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#9ca3af',
  },
};

// We inject a keyframe style block for the spinner animation if not present
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
