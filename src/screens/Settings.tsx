import React from 'react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { setLanguage, updateSettings } from '../firebase/repo';

export function Settings() {
  const t = useT();
  const navigate = useNavigate();
  const settings = useStore((s) => s.settings);
  const currentLang = settings?.language ?? 'en';
  const currentTheme = settings?.theme ?? 'dark';
  const currentScale = settings?.textScale ?? 'normal';

  const [shopName, setShopName] = React.useState(settings?.shopName || '');

  React.useEffect(() => {
    if (settings?.shopName !== undefined) {
      setShopName(settings.shopName);
    }
  }, [settings?.shopName]);

  const handleLanguageToggle = async (lang: 'en' | 'gu') => {
    try {
      await setLanguage(lang);
    } catch (err) {
      console.error('Error changing language:', err);
    }
  };

  const handleThemeToggle = async (theme: 'dark' | 'light') => {
    try {
      await updateSettings({ theme });
    } catch (err) {
      console.error('Error changing theme:', err);
    }
  };

  const handleTextScaleToggle = async (textScale: 'normal' | 'large') => {
    try {
      await updateSettings({ textScale });
    } catch (err) {
      console.error('Error changing text scale:', err);
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
          <h3 style={styles.sectionTitle}>{t('settings.shopName')}</h3>
          <input
            type="text"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            onBlur={async () => {
              try {
                await updateSettings({ shopName: shopName.trim() });
              } catch (err) {
                console.error('Error updating shop name:', err);
              }
            }}
            placeholder="e.g. Pareshbhai Tailor"
            style={styles.input}
          />
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>{t('settings.language')}</h3>
          <div style={styles.btnGroup}>
            <button
              onClick={() => handleLanguageToggle('en')}
              style={{
                ...styles.toggleBtn,
                background: currentLang === 'en' ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'var(--surface-2)',
                color: currentLang === 'en' ? '#ffffff' : 'var(--text)',
                border: currentLang === 'en' ? 'none' : '1px solid var(--border)',
                boxShadow: currentLang === 'en' ? '0 4px 14px rgba(124, 58, 237, 0.4)' : 'none',
              }}
            >
              English
            </button>
            <button
              onClick={() => handleLanguageToggle('gu')}
              style={{
                ...styles.toggleBtn,
                background: currentLang === 'gu' ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'var(--surface-2)',
                color: currentLang === 'gu' ? '#ffffff' : 'var(--text)',
                border: currentLang === 'gu' ? 'none' : '1px solid var(--border)',
                boxShadow: currentLang === 'gu' ? '0 4px 14px rgba(124, 58, 237, 0.4)' : 'none',
              }}
            >
              ગુજરાતી (Gujarati)
            </button>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>{t('settings.theme')}</h3>
          <div style={styles.btnGroup}>
            <button
              onClick={() => handleThemeToggle('dark')}
              style={{
                ...styles.toggleBtn,
                background: currentTheme === 'dark' ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'var(--surface-2)',
                color: currentTheme === 'dark' ? '#ffffff' : 'var(--text)',
                border: currentTheme === 'dark' ? 'none' : '1px solid var(--border)',
                boxShadow: currentTheme === 'dark' ? '0 4px 14px rgba(124, 58, 237, 0.4)' : 'none',
              }}
            >
              {t('settings.dark')}
            </button>
            <button
              onClick={() => handleThemeToggle('light')}
              style={{
                ...styles.toggleBtn,
                background: currentTheme === 'light' ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'var(--surface-2)',
                color: currentTheme === 'light' ? '#ffffff' : 'var(--text)',
                border: currentTheme === 'light' ? 'none' : '1px solid var(--border)',
                boxShadow: currentTheme === 'light' ? '0 4px 14px rgba(124, 58, 237, 0.4)' : 'none',
              }}
            >
              {t('settings.light')}
            </button>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>{t('settings.textSize')}</h3>
          <div style={styles.btnGroup}>
            <button
              onClick={() => handleTextScaleToggle('normal')}
              style={{
                ...styles.toggleBtn,
                background: currentScale === 'normal' ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'var(--surface-2)',
                color: currentScale === 'normal' ? '#ffffff' : 'var(--text)',
                border: currentScale === 'normal' ? 'none' : '1px solid var(--border)',
                boxShadow: currentScale === 'normal' ? '0 4px 14px rgba(124, 58, 237, 0.4)' : 'none',
              }}
            >
              {t('settings.normal')}
            </button>
            <button
              onClick={() => handleTextScaleToggle('large')}
              style={{
                ...styles.toggleBtn,
                background: currentScale === 'large' ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'var(--surface-2)',
                color: currentScale === 'large' ? '#ffffff' : 'var(--text)',
                border: currentScale === 'large' ? 'none' : '1px solid var(--border)',
                boxShadow: currentScale === 'large' ? '0 4px 14px rgba(124, 58, 237, 0.4)' : 'none',
              }}
            >
              {t('settings.large')}
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
    background: 'var(--bg)',
    color: 'var(--text)',
    fontFamily: '"Inter", "Noto Sans Gujarati", sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: '500px',
    background: 'var(--surface)',
    backdropFilter: 'blur(10px)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: 'none',
    boxSizing: 'border-box',
    marginTop: '20px',
  },
  title: {
    fontSize: 'calc(24px * var(--font-scale))',
    fontWeight: '600',
    margin: '0 0 24px 0',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: 'calc(14px * var(--font-scale))',
    fontWeight: '500',
    color: 'var(--text-muted)',
    marginBottom: '12px',
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--surface-2)',
    color: 'var(--text)',
    fontSize: 'calc(14px * var(--font-scale))',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
  },
  btnGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  toggleBtn: {
    padding: '12px',
    borderRadius: '8px',
    fontSize: 'calc(14px * var(--font-scale))',
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
    border: '1px solid var(--border)',
    background: 'var(--surface-2)',
    color: 'var(--text)',
    fontSize: 'calc(14px * var(--font-scale))',
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
    border: '1px solid color-mix(in srgb, var(--danger) 40%, transparent)',
    background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
    color: 'var(--danger)',
    fontSize: 'calc(14px * var(--font-scale))',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};
