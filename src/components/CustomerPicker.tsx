import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { matchesQuery } from '../domain/search';
import { createCustomer } from '../firebase/repo';

interface CustomerPickerProps {
  value: string; // selected customerId
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function CustomerPicker({ value, onSelect, disabled }: CustomerPickerProps) {
  const t = useT();
  const customers = useStore((s) => s.customers);
  const [query, setQuery] = useState('');
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'female' | 'male' | 'other'>('female');

  // Look up selected customer details
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === value);
  }, [customers, value]);

  // Filter customers by query
  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter((c) => matchesQuery({ name: c.name, phone: c.phone || '', token: '' }, q))
      .slice(0, 8);
  }, [customers, query]);

  // Check if there is an exact case-insensitive match for the current query
  const hasExactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return customers.some((c) => c.name.trim().toLowerCase() === q);
  }, [customers, query]);

  const handleSelect = (id: string) => {
    onSelect(id);
    setQuery('');
  };

  const handleStartAdd = () => {
    setIsAddingInline(true);
    setPhone('');
    setGender('female');
  };

  const handleSaveInline = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = query.trim();
    if (!trimmedName) return;

    try {
      const ref = await createCustomer({
        name: trimmedName,
        phone: phone.trim() || undefined,
        gender: gender || undefined,
        notes: '',
      });
      onSelect(ref.id);
      setIsAddingInline(false);
      setQuery('');
    } catch (err) {
      console.error('Error adding inline customer:', err);
    }
  };

  const handleCancelInline = () => {
    setIsAddingInline(false);
  };

  if (selectedCustomer) {
    return (
      <div style={styles.selectedWrapper}>
        <div style={styles.selectedMeta}>
          <div style={styles.selectedName}>{selectedCustomer.name}</div>
          {selectedCustomer.phone && <div style={styles.selectedPhone}>{selectedCustomer.phone}</div>}
          <div style={styles.selectedGender}>
            {selectedCustomer.gender ? t(`templates.gender.${selectedCustomer.gender}`) : ''}
          </div>
        </div>
        {!disabled && (
          <button type="button" onClick={() => onSelect('')} style={styles.changeBtn}>
            {t('common.change') || 'Change'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {isAddingInline ? (
        <form onSubmit={handleSaveInline} style={styles.inlineForm}>
          <div style={styles.formTitle}>
            {t('customers.addCustomer') || 'Add Customer'}: <strong>{query.trim()}</strong>
          </div>
          <div style={styles.inputRow}>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('customers.phone') || 'Phone'}
              style={styles.inlineInput}
            />
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              style={styles.inlineSelect}
            >
              <option value="female">{t('templates.gender.female') || 'Female'}</option>
              <option value="male">{t('templates.gender.male') || 'Male'}</option>
              <option value="other">{t('templates.gender.other') || 'Other'}</option>
            </select>
          </div>
          <div style={styles.btnRow}>
            <button type="submit" style={styles.saveBtn}>
              {t('common.save') || 'Save'}
            </button>
            <button type="button" onClick={handleCancelInline} style={styles.cancelBtn}>
              {t('common.cancel') || 'Cancel'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div style={styles.searchWrapper}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('orders.selectCustomer') || 'Select Customer'}
              disabled={disabled}
              style={styles.searchInput}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} style={styles.clearBtn}>
                ✕
              </button>
            )}
          </div>

          {query.trim().length > 0 && (
            <div style={styles.dropdown}>
              {filteredCustomers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  style={styles.item}
                >
                  <span style={styles.itemName}>{c.name}</span>
                  {c.phone && <span style={styles.itemPhone}> ({c.phone})</span>}
                </div>
              ))}

              {!hasExactMatch && (
                <div onClick={handleStartAdd} style={styles.addInlineRow}>
                  <span>＋ {t('common.add') || 'Add'}: "{query.trim()}"</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    boxSizing: 'border-box',
  },
  selectedWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px dashed rgba(255, 255, 255, 0.2)',
    background: 'rgba(255, 255, 255, 0.02)',
    boxSizing: 'border-box',
  },
  selectedMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  selectedName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  selectedPhone: {
    fontSize: '13px',
    color: '#9ca3af',
  },
  selectedGender: {
    fontSize: '12px',
    color: '#3b82f6',
    textTransform: 'capitalize',
  },
  changeBtn: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    padding: '6px 12px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  searchInput: {
    width: '100%',
    padding: '12px 40px 12px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: '"Inter", sans-serif',
  },
  clearBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '4px',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#1f2937',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    marginTop: '6px',
    maxHeight: '240px',
    overflowY: 'auto',
    zIndex: 100,
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    boxSizing: 'border-box',
  },
  item: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    cursor: 'pointer',
    transition: 'background 0.2s',
    color: '#ffffff',
    fontSize: '14px',
  },
  itemName: {
    fontWeight: '600',
  },
  itemPhone: {
    color: '#9ca3af',
    fontSize: '13px',
  },
  addInlineRow: {
    padding: '12px 16px',
    background: 'rgba(59, 130, 246, 0.1)',
    color: '#60a5fa',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'background 0.2s',
  },
  inlineForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '14px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    boxSizing: 'border-box',
  },
  formTitle: {
    fontSize: '14px',
    color: '#ffffff',
  },
  inputRow: {
    display: 'flex',
    gap: '10px',
  },
  inlineInput: {
    flex: 2,
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  inlineSelect: {
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: '#1f2937',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  btnRow: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
  },
  saveBtn: {
    background: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelBtn: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer',
  },
};
