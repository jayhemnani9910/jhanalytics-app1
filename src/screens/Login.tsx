import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useT } from '../i18n/useT';

export function Login() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      console.error(err);
      setError(t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>{t('login.title')}</h2>
        
        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="login-email" style={styles.label}>{t('login.email')}</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="shop@example.com"
              disabled={loading}
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="login-password" style={styles.label}>{t('login.password')}</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            style={loading ? { ...styles.button, ...styles.buttonDisabled } : styles.button}
          >
            {loading ? '...' : t('login.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'var(--bg)',
    padding: '16px',
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: 'var(--surface)',
    backdropFilter: 'blur(10px)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: 'none',
    textAlign: 'left',
    boxSizing: 'border-box',
  },
  title: {
    fontSize: 'calc(28px * var(--font-scale))',
    fontWeight: '600',
    color: 'var(--text)',
    margin: '0 0 24px 0',
    textAlign: 'center',
    letterSpacing: '-0.5px',
  },
  error: {
    background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
    border: '1px solid color-mix(in srgb, var(--danger) 20%, transparent)',
    color: 'var(--danger)',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'calc(14px * var(--font-scale))',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: 'calc(14px * var(--font-scale))',
    fontWeight: '500',
    color: 'var(--text-muted)',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--surface-2)',
    color: 'var(--text)',
    fontSize: 'calc(16px * var(--font-scale))',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  },
  button: {
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    color: '#ffffff',
    fontSize: 'calc(16px * var(--font-scale))',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: 'none',
    transition: 'all 0.2s ease',
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
};
