import React from 'react';
import { AuthGate } from './auth/AuthGate';

function App() {
  return (
    <AuthGate>
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Tailor Measurement App</h1>
          <p style={styles.text}>Welcome back! You are authenticated.</p>
        </div>
      </div>
    </AuthGate>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'radial-gradient(circle at top right, #1f2937, #111827)',
    padding: '16px',
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#ffffff',
    margin: '0 0 16px 0',
  },
  text: {
    fontSize: '16px',
    color: '#9ca3af',
    margin: 0,
  },
};

export default App;
