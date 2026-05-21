import React, { useState, useEffect, useRef } from 'react';
import { useT } from '../i18n/useT';
import type { MeasurementRow } from '../types';

interface MeasureModeProps {
  rows: MeasurementRow[];
  onChange: (updatedRows: MeasurementRow[]) => void;
  onClose: () => void;
}

export function MeasureMode({ rows, onChange, onClose }: MeasureModeProps) {
  const t = useT();
  const [currentIdx, setCurrentIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentRow = rows[currentIdx];

  // Auto focus input on mount and step change
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIdx]);

  if (!currentRow) {
    return null;
  }

  const handleValueChange = (val: string) => {
    const updated = [...rows];
    updated[currentIdx] = { ...currentRow, value: val };
    onChange(updated);
  };

  const handleAppendHalf = () => {
    handleValueChange((currentRow.value || '') + '½');
  };

  const handleNext = () => {
    if (currentIdx < rows.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNext();
    }
  };

  const progressPercent = ((currentIdx + 1) / rows.length) * 100;

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.title}>{t('orders.measurements') || 'Measurements'}</div>
          <button type="button" onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div style={styles.progressContainer}>
          <div style={{ ...styles.progressBar, width: `${progressPercent}%` }} />
        </div>

        <div style={styles.stepInfo}>
          Step {currentIdx + 1} of {rows.length}
        </div>

        {/* Main interactive area */}
        <div style={styles.card}>
          <div style={styles.fieldLabel}>
            {currentRow.label}
            {currentRow.unit && <span style={styles.fieldUnit}> ({currentRow.unit})</span>}
          </div>

          <div style={styles.inputWrapper}>
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={currentRow.value}
              onChange={(e) => handleValueChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="0.0"
              style={styles.giantInput}
            />
            <button
              type="button"
              onClick={handleAppendHalf}
              style={styles.halfBtn}
            >
              ½
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div style={styles.footer}>
          <button
            type="button"
            onClick={handleBack}
            disabled={currentIdx === 0}
            style={{
              ...styles.navBtn,
              ...(currentIdx === 0 ? styles.disabledBtn : styles.secondaryBtn),
            }}
          >
            ← {t('common.cancel') || 'Back'}
          </button>

          <button
            type="button"
            onClick={handleNext}
            style={{ ...styles.navBtn, ...styles.primaryBtn }}
          >
            {currentIdx === rows.length - 1 ? (t('common.save') || 'Done ✓') : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: '#111827',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    boxSizing: 'border-box',
  },
  container: {
    width: '100%',
    maxWidth: '480px',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxHeight: '600px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '8px',
  },
  progressContainer: {
    width: '100%',
    height: '6px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '3px',
    marginBottom: '8px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: '#3b82f6',
    borderRadius: '3px',
    transition: 'width 0.3s ease-out',
  },
  stepInfo: {
    fontSize: '13px',
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: '24px',
  },
  card: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    padding: '40px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    boxSizing: 'border-box',
    marginBottom: '24px',
  },
  fieldLabel: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: '0.5px',
  },
  fieldUnit: {
    fontSize: '18px',
    color: '#9ca3af',
    fontWeight: 'normal',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    justifyContent: 'center',
  },
  giantInput: {
    width: '180px',
    height: '70px',
    background: '#1f2937',
    border: '2px solid #3b82f6',
    borderRadius: '16px',
    color: '#ffffff',
    fontSize: '32px',
    fontWeight: 'bold',
    textAlign: 'center',
    outline: 'none',
    boxSizing: 'border-box',
  },
  halfBtn: {
    height: '70px',
    width: '70px',
    background: 'rgba(59, 130, 246, 0.15)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '16px',
    color: '#60a5fa',
    fontSize: '24px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  footer: {
    display: 'flex',
    gap: '16px',
  },
  navBtn: {
    flex: 1,
    height: '52px',
    borderRadius: '14px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
  },
  primaryBtn: {
    background: '#3b82f6',
    color: '#ffffff',
  },
  secondaryBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
  },
  disabledBtn: {
    background: 'rgba(255, 255, 255, 0.03)',
    color: 'rgba(255, 255, 255, 0.3)',
    cursor: 'not-allowed',
  },
};
