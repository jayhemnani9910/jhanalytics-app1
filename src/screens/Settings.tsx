import React from 'react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { setLanguage } from '../firebase/repo';

export function Settings() {
  const t = useT();
  const navigate = useNavigate();
  const settings = useStore((s) => s.settings);
  const currentLang = settings?.language ?? 'en';

  const handleLanguageToggle = async (lang: 'en' | 'gu') => {
    try {
      await setLanguage(lang);
    } catch (err) {
      console.error('Error changing language:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>{t('nav.settings')}</h1>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>{t('settings.language')}</h3>
          <div style={styles.btnGroup}>
            <button
              onClick={() => handleLanguageToggle('en')}
              style={{
                ...styles.toggleBtn,
                background: currentLang === 'en' ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                border: currentLang === 'en' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: currentLang === 'en' ? '0 4px 14px rgba(124, 58, 237, 0.4)' : 'none',
              }}
            >
              English
            </button>
            <button
              onClick={() => handleLanguageToggle('gu')}
              style={{
                ...styles.toggleBtn,
                background: currentLang === 'gu' ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                border: currentLang === 'gu' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: currentLang === 'gu' ? '0 4px 14px rgba(124, 58, 237, 0.4)' : 'none',
              }}
            >
              ગુજરાતી (Gujarati)
            </button>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>{t('settings.templates')}</h3>
          <button
            onClick={() => navigate('/templates')}
            style={styles.templatesBtn}
          >
            {t('settings.templates')}
          </button>
        </div>

        <div style={styles.section}>
          <button
            onClick={handleSignOut}
            style={styles.signOutBtn}
            id="settings-signout"
          >
            {t('settings.logout')}
          </button>
        </div>
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
    fontFamily: '"Inter", "Noto Sans Gujarati", sans-serif',
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
    margin: '0 0 24px 0',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#9ca3af',
    marginBottom: '12px',
  },
  btnGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  toggleBtn: {
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    textAlign: 'center',
  },
  templatesBtn: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center',
    marginBottom: '8px',
  },
  signOutBtn: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};
