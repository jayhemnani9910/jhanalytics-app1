import React from 'react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }: SearchBarProps) {
  return (
    <div style={styles.searchWrapper}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={styles.searchIcon}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={styles.searchInput}
      />
      {value && (
        <button onClick={() => onChange('')} style={styles.clearBtn}>
          ✕
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    maxWidth: '500px',
    boxSizing: 'border-box',
    margin: '0 auto 16px auto',
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    width: '16px',
    height: '16px',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '12px 40px 12px 42px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: 'calc(15px * var(--font-scale))',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
    fontFamily: '"Inter", sans-serif',
  },
  clearBtn: {
    position: 'absolute',
    right: '14px',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 'calc(14px * var(--font-scale))',
    cursor: 'pointer',
    padding: '4px',
  },
};
