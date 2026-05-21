import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { SearchBar } from '../components/SearchBar';
import { matchesQuery } from '../domain/search';
import { orderStatusRollup } from '../domain/status';
import { createCustomer } from '../firebase/repo';
import type { Gender } from '../types';

export function Customers() {
  const t = useT();
  const navigate = useNavigate();

  // Store data
  const customers = useStore((s) => s.customers);
  const orders = useStore((s) => s.orders);

  // Search state & debouncing
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(handler);
  }, [search]);

  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formGender, setFormGender] = useState<Gender>('female');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to count orders for a customer
  const getCustomerOrdersCount = (customerId: string) => {
    return orders.filter((o) => o.customerId === customerId).length;
  };

  // Helper to get active tokens for search matching
  const getCustomerActiveTokens = (customerId: string) => {
    return orders
      .filter((o) => o.customerId === customerId && orderStatusRollup(o.items) !== 'delivered')
      .map((o) => o.tokenNo)
      .join(' ');
  };

  // Handle adding new customer
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError(t('customers.requiredName'));
      return;
    }

    setFormError('');
    setIsSubmitting(true);
    try {
      await createCustomer({
        name: formName.trim(),
        phone: formPhone.trim() || undefined,
        gender: formGender,
        notes: formNotes.trim() || undefined,
      });
      // Reset form
      setFormName('');
      setFormPhone('');
      setFormGender('female');
      setFormNotes('');
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Error creating customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Process & filter customers list
  const filteredCustomers = customers
    .map((c) => {
      const activeTokens = getCustomerActiveTokens(c.id);
      return {
        customer: c,
        searchFields: {
          name: c.name,
          phone: c.phone || '',
          token: activeTokens,
        },
      };
    })
    .filter(({ searchFields }) => matchesQuery(searchFields, debouncedSearch))
    .map(({ customer }) => customer)
    .sort((a, b) => a.nameLower.localeCompare(b.nameLower));

  // Initials for avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Color helper based on name hash for consistent avatar backgrounds
  const getAvatarBg = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `linear-gradient(135deg, hsl(${hue}, 70%, 45%), hsl(${hue}, 70%, 30%))`;
  };

  return (
    <div style={styles.container}>
      {/* Header section */}
      <div style={styles.header}>
        <h1 style={styles.title}>{t('nav.customers')}</h1>
        <button style={styles.addButton} onClick={() => setIsModalOpen(true)}>
          <span style={styles.plusIcon}>+</span>
          {t('customers.addCustomer')}
        </button>
      </div>

      {/* Search area */}
      <div style={styles.searchContainer}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('customers.searchPlaceholder')}
        />
      </div>

      {/* Customers List */}
      <div style={styles.listContainer}>
        {filteredCustomers.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>{t('customers.empty')}</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => {
            const count = getCustomerOrdersCount(customer.id);
            return (
              <div
                key={customer.id}
                style={styles.customerCard}
                onClick={() => navigate(`/customers/${customer.id}`)}
              >
                <div
                  style={{
                    ...styles.avatar,
                    background: getAvatarBg(customer.name),
                  }}
                >
                  {getInitials(customer.name)}
                </div>
                <div style={styles.customerInfo}>
                  <div style={styles.nameRow}>
                    <h3 style={styles.customerName}>{customer.name}</h3>
                    {customer.gender && (
                      <span
                        style={{
                          ...styles.genderBadge,
                          ...styles[customer.gender],
                        }}
                      >
                        {t(`templates.gender.${customer.gender}`)}
                      </span>
                    )}
                  </div>
                  {customer.phone && (
                    <div style={styles.phoneRow}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={styles.phoneIcon}
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span style={styles.customerPhone}>{customer.phone}</span>
                    </div>
                  )}
                  {customer.notes && (
                    <p style={styles.notesText}>{customer.notes}</p>
                  )}
                </div>
                <div style={styles.orderBadge}>
                  <span style={styles.orderCountNum}>{count}</span>
                  <span style={styles.orderLabel}>{t('nav.orders')}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Customer Modal Drawer */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{t('customers.addCustomer')}</h2>
              <button style={styles.closeButton} onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              {formError && <div style={styles.errorBanner}>{formError}</div>}

              <div style={styles.formGroup}>
                <label style={styles.label}>{t('customers.name')} *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Ramesh Patel"
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>{t('customers.phone')}</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g., 9876543210"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>{t('customers.gender')}</label>
                <div style={styles.segmentedControl}>
                  {(['female', 'male', 'other'] as const).map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      onClick={() => setFormGender(gender)}
                      style={{
                        ...styles.segmentButton,
                        ...(formGender === gender ? styles.segmentButtonActive : {}),
                      }}
                    >
                      {t(`templates.gender.${gender}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>{t('customers.notes')}</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g., standard sizing, prefers loose neck"
                  style={styles.textarea}
                  rows={3}
                />
              </div>

              <div style={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={styles.cancelButton}
                  disabled={isSubmitting}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" style={styles.submitButton} disabled={isSubmitting}>
                  {isSubmitting ? '...' : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: '500px',
    marginBottom: '20px',
    boxSizing: 'border-box',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    margin: 0,
    background: 'linear-gradient(to right, #60a5fa, #3b82f6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  addButton: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
    transition: 'all 0.2s ease',
  },
  plusIcon: {
    fontSize: '18px',
    lineHeight: '1',
  },
  searchContainer: {
    width: '100%',
    maxWidth: '500px',
    boxSizing: 'border-box',
  },
  listContainer: {
    width: '100%',
    maxWidth: '500px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxSizing: 'border-box',
    marginTop: '8px',
  },
  emptyState: {
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '40px 20px',
    textAlign: 'center',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: '15px',
    margin: 0,
  },
  customerCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, background-color 0.2s ease',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '16px',
    color: '#ffffff',
    flexShrink: 0,
    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
  },
  customerInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  customerName: {
    fontSize: '17px',
    fontWeight: '600',
    margin: 0,
    color: '#f3f4f6',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  genderBadge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '99px',
    textTransform: 'capitalize',
  },
  female: {
    background: 'rgba(236, 72, 153, 0.15)',
    color: '#f472b6',
    border: '1px solid rgba(236, 72, 153, 0.25)',
  },
  male: {
    background: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
    border: '1px solid rgba(59, 130, 246, 0.25)',
  },
  other: {
    background: 'rgba(168, 85, 247, 0.15)',
    color: '#c084fc',
    border: '1px solid rgba(168, 85, 247, 0.25)',
  },
  phoneRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#9ca3af',
  },
  phoneIcon: {
    width: '12px',
    height: '12px',
    color: '#9ca3af',
  },
  customerPhone: {
    fontSize: '13px',
  },
  notesText: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '2px 0 0 0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  orderBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    padding: '6px 10px',
    minWidth: '50px',
    boxSizing: 'border-box',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  orderCountNum: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#60a5fa',
  },
  orderLabel: {
    fontSize: '9px',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: '2px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease-out',
  },
  modalContent: {
    width: '100%',
    maxWidth: '500px',
    background: '#1f2937',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderBottom: 'none',
    padding: '24px',
    boxSizing: 'border-box',
    boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
    maxHeight: '85vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    margin: 0,
    color: '#ffffff',
  },
  closeButton: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: 'none',
    color: '#9ca3af',
    fontSize: '16px',
    width: '32px',
    height: '32px',
    borderRadius: '99px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#f87171',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '13px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#9ca3af',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: '"Inter", sans-serif',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'none',
    fontFamily: '"Inter", sans-serif',
  },
  segmentedControl: {
    display: 'flex',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '10px',
    padding: '2px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  segmentButton: {
    flex: 1,
    padding: '10px',
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  segmentButtonActive: {
    background: '#3b82f6',
    color: '#ffffff',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    color: '#e5e7eb',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitButton: {
    flex: 1,
    padding: '12px',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
  },
};

