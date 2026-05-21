import React, { useState, useRef } from 'react';
import type { OrderItem, Template, MeasurementRow, Order, OrderStatus } from '../types';
import { useT } from '../i18n/useT';
import { rowsFromTemplate, prefillRows } from '../domain/measurements';

interface GarmentItemEditorProps {
  item: OrderItem;
  onChange: (updatedItem: OrderItem) => void;
  onRemove: () => void;
  templates: Template[];
  customerOrders: Order[];
  genderPreference?: string;
}

export function GarmentItemEditor({
  item,
  onChange,
  onRemove,
  templates,
  customerOrders,
  genderPreference,
}: GarmentItemEditorProps) {
  const t = useT();
  const [prefillFlag, setPrefillFlag] = useState(false);
  const valueInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Suggest templates matching gender preference first
  const sortedTemplates = [...templates].sort((a, b) => {
    if (genderPreference) {
      const aMatch = a.gender === genderPreference;
      const bMatch = b.gender === genderPreference;
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
    }
    return a.name.localeCompare(b.name);
  });

  const handleTemplateChange = (templateId: string) => {
    setPrefillFlag(false);
    if (templateId === 'custom') {
      onChange({
        ...item,
        templateId: null,
        garmentType: t('orders.customGarment'),
        measurements: [],
      });
      return;
    }

    const template = templates.find((tpl) => tpl.id === templateId);
    if (!template) return;

    // Check history prefill
    const history = prefillRows(customerOrders, template.id, template);
    if (history) {
      onChange({
        ...item,
        templateId: template.id,
        garmentType: template.name,
        measurements: history,
      });
      setPrefillFlag(true);
    } else {
      onChange({
        ...item,
        templateId: template.id,
        garmentType: template.name,
        measurements: rowsFromTemplate(template),
      });
    }
  };

  const handleMeasurementChange = (index: number, field: keyof MeasurementRow, val: string) => {
    const updated = [...item.measurements];
    updated[index] = { ...updated[index], [field]: val };
    onChange({ ...item, measurements: updated });
  };

  const addCustomMeasurement = () => {
    onChange({
      ...item,
      measurements: [
        ...item.measurements,
        { fieldId: null, label: '', value: '', unit: 'in' },
      ],
    });
  };

  const removeMeasurement = (index: number) => {
    const updated = item.measurements.filter((_, i) => i !== index);
    onChange({ ...item, measurements: updated });
  };

  return (
    <div style={styles.card}>
      {/* Header with remove item */}
      <div style={styles.header}>
        <span style={styles.itemTitle}>{item.garmentType || t('orders.customGarment')}</span>
        <button type="button" onClick={onRemove} style={styles.removeBtn}>
          ✕ Remove
        </button>
      </div>

      <div style={styles.body}>
        {/* Template Select */}
        <div style={styles.formGroup}>
          <label style={styles.label}>{t('orders.selectTemplate')}</label>
          <select
            value={item.templateId || 'custom'}
            onChange={(e) => handleTemplateChange(e.target.value)}
            style={styles.select}
          >
            <option value="custom">{t('orders.customGarment')}</option>
            {sortedTemplates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name} {tpl.gender ? `(${t(`templates.gender.${tpl.gender}`)})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Prefilled Banner */}
        {prefillFlag && (
          <div style={styles.prefillBanner}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={styles.prefillIcon}
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {t('orders.prefilled')}
          </div>
        )}

        {/* Qty & Price & Status */}
        <div style={styles.row}>
          <div style={{ ...styles.formGroup, flex: 1 }}>
            <label style={styles.label}>{t('orders.quantity')}</label>
            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => onChange({ ...item, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              style={styles.input}
              required
            />
          </div>

          <div style={{ ...styles.formGroup, flex: 1.5 }}>
            <label style={styles.label}>{t('orders.price')}</label>
            <input
              type="number"
              min="0"
              value={item.price ?? ''}
              onChange={(e) => onChange({ ...item, price: Math.max(0, parseFloat(e.target.value) || 0) })}
              placeholder="0"
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Garment Status</label>
          <div style={styles.segmentedControl}>
            {(['pending', 'ready', 'delivered'] as OrderStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => onChange({ ...item, status })}
                style={{
                  ...styles.segmentButton,
                  ...(item.status === status ? styles.segmentButtonActive : {}),
                }}
              >
                {t(`orders.status.${status}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Measurements */}
        <div style={styles.measurementsSection}>
          <div style={styles.measurementsHeader}>
            <h4 style={styles.sectionTitle}>{t('orders.measurements')}</h4>
            <button
              type="button"
              onClick={addCustomMeasurement}
              style={styles.addCustomRowBtn}
            >
              + {t('orders.addCustomRow')}
            </button>
          </div>

          <div style={styles.rowsGrid}>
            {item.measurements.length === 0 ? (
              <p style={styles.emptyRowsText}>No measurements. Click 'Add Custom Row' or select a template garment above.</p>
            ) : (
              item.measurements.map((row, idx) => {
                const isTemplateField = row.fieldId !== null;
                return (
                  <div key={idx} style={styles.measurementRow}>
                    {isTemplateField ? (
                      <span style={styles.templateFieldLabel}>
                        {row.label} ({row.unit})
                      </span>
                    ) : (
                      <input
                        type="text"
                        value={row.label}
                        onChange={(e) => handleMeasurementChange(idx, 'label', e.target.value)}
                        placeholder="Label"
                        style={styles.customFieldLabelInput}
                        required
                      />
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        ref={(el) => { valueInputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="decimal"
                        value={row.value}
                        onChange={(e) => handleMeasurementChange(idx, 'value', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const nextInput = valueInputRefs.current[idx + 1];
                            if (nextInput) {
                              nextInput.focus();
                            } else {
                              valueInputRefs.current[idx]?.blur();
                            }
                          }
                        }}
                        placeholder="e.g. 38½, loose"
                        style={styles.valueInput}
                      />
                      <button
                        type="button"
                        onClick={() => handleMeasurementChange(idx, 'value', (row.value || '') + '½')}
                        style={styles.fractionBtn}
                      >
                        ½
                      </button>
                    </div>

                    {!isTemplateField && (
                      <button
                        type="button"
                        onClick={() => removeMeasurement(idx)}
                        style={styles.deleteRowBtn}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '16px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '8px',
  },
  itemTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#60a5fa',
  },
  removeBtn: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    color: '#f87171',
    padding: '4px 10px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#9ca3af',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    background: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: '"Inter", sans-serif',
  },
  prefillBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#34d399',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    padding: '8px 12px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '500',
  },
  prefillIcon: {
    width: '14px',
    height: '14px',
  },
  row: {
    display: 'flex',
    gap: '12px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    background: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: '"Inter", sans-serif',
  },
  segmentedControl: {
    display: 'flex',
    background: '#111827',
    borderRadius: '10px',
    padding: '2px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  segmentButton: {
    flex: 1,
    padding: '8px',
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  segmentButtonActive: {
    background: '#3b82f6',
    color: '#ffffff',
  },
  measurementsSection: {
    marginTop: '6px',
    background: 'rgba(0,0,0,0.15)',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.03)',
  },
  measurementsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '13px',
    fontWeight: '600',
    color: '#d1d5db',
  },
  addCustomRowBtn: {
    background: 'none',
    border: 'none',
    color: '#60a5fa',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '4px 0',
  },
  emptyRowsText: {
    margin: 0,
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center',
    padding: '12px 0',
    lineHeight: '1.4',
  },
  rowsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  measurementRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  templateFieldLabel: {
    flex: 1,
    fontSize: '13px',
    color: '#e5e7eb',
    fontWeight: '500',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  customFieldLabelInput: {
    flex: 1,
    padding: '8px 10px',
    background: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  valueInput: {
    width: '120px',
    minHeight: '44px',
    padding: '8px 10px',
    background: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    textAlign: 'right',
  },
  fractionBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    padding: '0 12px',
    minHeight: '44px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
  },
  deleteRowBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '4px',
  },
};
