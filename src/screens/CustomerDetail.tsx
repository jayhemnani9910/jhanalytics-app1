import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { orderStatusRollup } from '../domain/status';
import { orderTotal, orderBalance } from '../domain/money';
import { deadlineBucket, todayStr } from '../domain/deadline';
import { updateCustomer, deleteCustomer } from '../firebase/repo';
import type { Gender } from '../types';

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const navigate = useNavigate();

  // Store data
  const customers = useStore((s) => s.customers);
  const orders = useStore((s) => s.orders);

  // Find current customer
  const customer = customers.find((c) => c.id === id);

  // Filter and sort customer's orders (newest first)
  const customerOrders = orders
    .filter((o) => o.customerId === id)
    .sort((a, b) => b.createdAt - a.createdAt);

  // Edit form states
  const [isEditing, setIsEditing] = useState(false);
  const [formName, setFormName] = useState(customer?.name || '');
  const [formPhone, setFormPhone] = useState(customer?.phone || '');
  const [formGender, setFormGender] = useState<Gender>(customer?.gender || 'female');
  const [formNotes, setFormNotes] = useState(customer?.notes || '');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Action error states
  const [actionError, setActionError] = useState('');

  if (!customer) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <h2 style={styles.errorTitle}>Customer Not Found</h2>
          <button style={styles.backBtn} onClick={() => navigate('/customers')}>
            ← Back to Customers
          </button>
        </div>
      </div>
    );
  }

  // Handle save edit details
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError(t('customers.requiredName'));
      return;
    }

    setFormError('');
    setIsSaving(true);
    try {
      await updateCustomer(customer.id, {
        name: formName.trim(),
        phone: formPhone.trim() || undefined,
        gender: formGender,
        notes: formNotes.trim() || undefined,
      });
      setIsEditing(false);
      setActionError('');
    } catch (err: any) {
      setFormError(err.message || 'Error updating customer');
    } finally {
      setIsSaving(false);
    }
  };

  // Start editing
  const startEditing = () => {
    setFormName(customer.name);
    setFormPhone(customer.phone || '');
    setFormGender(customer.gender || 'female');
    setFormNotes(customer.notes || '');
    setFormError('');
    setIsEditing(true);
  };

  // Handle delete customer
  const handleDelete = async () => {
    if (!window.confirm(t('customers.deleteConfirm'))) return;

    setActionError('');
    try {
      await deleteCustomer(customer.id);
      navigate('/customers');
    } catch (err: any) {
      setActionError(err.message || 'Error deleting customer');
    }
  };

  // Initials for avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Color helper based on name hash
  const getAvatarBg = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `linear-gradient(135deg, hsl(${hue}, 70%, 45%), hsl(${hue}, 70%, 30%))`;
  };

  // Get items summary text
  const getGarmentsSummary = (items: any[]) => {
    if (items.length === 0) return 'No garments';
    return items.map((i) => `${i.quantity}x ${i.garmentType}`).join(', ');
  };

  return (
    <div style={styles.container}>
      {/* Back button */}
      <div style={styles.backHeader}>
        <button style={styles.backLink} onClick={() => navigate('/customers')}>
          <span style={styles.backArrow}>←</span> {t('nav.customers')}
        </button>
      </div>

      {actionError && <div style={styles.actionErrorBanner}>{actionError}</div>}

      {/* Main card */}
      <div style={styles.profileCard}>
        {isEditing ? (
          <form onSubmit={handleSave} style={styles.form}>
            <div style={styles.formHeader}>
              <h2 style={styles.formTitle}>{t('customers.edit')}</h2>
              {formError && <div style={styles.errorBanner}>{formError}</div>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{t('customers.name')} *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
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
                style={styles.textarea}
                rows={3}
              />
            </div>

            <div style={styles.formActions}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={styles.cancelButton}
                disabled={isSaving}
              >
                {t('common.cancel')}
              </button>
              <button type="submit" style={styles.submitButton} disabled={isSaving}>
                {isSaving ? '...' : t('common.save')}
              </button>
            </div>
          </form>
        ) : (
          <div style={styles.profileView}>
            <div style={styles.profileHeader}>
              <div
                style={{
                  ...styles.avatar,
                  background: getAvatarBg(customer.name),
                }}
              >
                {getInitials(customer.name)}
              </div>
              <div style={styles.profileMeta}>
                <div style={styles.nameRow}>
                  <h1 style={styles.profileName}>{customer.name}</h1>
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
                {customer.phone ? (
                  <a href={`tel:${customer.phone}`} style={styles.phoneLink}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={styles.phoneIcon}
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {customer.phone}
                  </a>
                ) : (
                  <span style={styles.noPhoneText}>No phone number</span>
                )}
              </div>
            </div>

            {customer.notes && (
              <div style={styles.notesSection}>
                <h4 style={styles.notesLabel}>{t('customers.notes')}</h4>
                <p style={styles.notesVal}>{customer.notes}</p>
              </div>
            )}

            <div style={styles.actionRow}>
              <button style={styles.editButton} onClick={startEditing}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={styles.btnIcon}
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                {t('customers.edit')}
              </button>
              <button style={styles.deleteButton} onClick={handleDelete}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={styles.btnIcon}
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                {t('customers.delete')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Orders section */}
      <div style={styles.ordersHeader}>
        <h2 style={styles.ordersTitle}>{t('customers.orderHistory')}</h2>
        <button
          style={styles.newOrderBtn}
          onClick={() => navigate(`/orders/new?customerId=${customer.id}`)}
        >
          <span style={styles.plusIcon}>+</span> {t('common.newOrder')}
        </button>
      </div>

      <div style={styles.ordersList}>
        {customerOrders.length === 0 ? (
          <div style={styles.emptyOrders}>
            <p style={styles.emptyOrdersText}>{t('customers.noOrders')}</p>
          </div>
        ) : (
          customerOrders.map((order) => {
            const total = orderTotal(order);
            const balance = orderBalance(order);
            const rollup = orderStatusRollup(order.items);
            const today = todayStr();
            const bucket = deadlineBucket(order.deadline, today, rollup);

            return (
              <div
                key={order.id}
                style={styles.orderCard}
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <div style={styles.orderCardHeader}>
                  <div style={styles.tokenBadge}>
                    <span style={styles.tokenLabel}>TOKEN</span>
                    <span style={styles.tokenNum}>{order.tokenNo}</span>
                  </div>
                  <div style={styles.statusGroup}>
                    <span style={{ ...styles.statusBadge, ...styles[`status_${rollup}`] }}>
                      {t(`orders.status.${rollup}`)}
                    </span>
                    <span style={{ ...styles.deadlineBadge, ...styles[`deadline_${bucket}`] }}>
                      {order.deadline}
                    </span>
                  </div>
                </div>

                <div style={styles.orderCardBody}>
                  <p style={styles.garmentSummary}>{getGarmentsSummary(order.items)}</p>
                </div>

                <div style={styles.orderCardFooter}>
                  <div style={styles.pricingCol}>
                    <span style={styles.pricingLabel}>Total</span>
                    <span style={styles.pricingVal}>₹{total}</span>
                  </div>
                  <div style={styles.pricingCol}>
                    <span style={styles.pricingLabel}>Balance</span>
                    <span
                      style={{
                        ...styles.pricingVal,
                        color: balance > 0 ? '#fbbf24' : '#10b981',
                      }}
                    >
                      ₹{balance}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
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
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  errorCard: {
    width: '100%',
    maxWidth: '500px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center',
    marginTop: '40px',
  },
  errorTitle: {
    margin: '0 0 16px 0',
    color: '#f87171',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
  },
  backHeader: {
    width: '100%',
    maxWidth: '500px',
    marginBottom: '16px',
    boxSizing: 'border-box',
    display: 'flex',
  },
  backLink: {
    background: 'none',
    border: 'none',
    color: '#60a5fa',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 0',
  },
  backArrow: {
    fontSize: '18px',
  },
  actionErrorBanner: {
    width: '100%',
    maxWidth: '500px',
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    color: '#f87171',
    padding: '12px 16px',
    borderRadius: '12px',
    marginBottom: '16px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  profileCard: {
    width: '100%',
    maxWidth: '500px',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '20px',
    padding: '20px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
    boxSizing: 'border-box',
    marginBottom: '24px',
  },
  profileView: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '20px',
    color: '#ffffff',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  profileMeta: {
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
  profileName: {
    fontSize: '22px',
    fontWeight: '700',
    margin: 0,
    color: '#ffffff',
  },
  genderBadge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '99px',
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
  phoneLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#60a5fa',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '500',
  },
  phoneIcon: {
    width: '14px',
    height: '14px',
  },
  noPhoneText: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  notesSection: {
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '12px',
    padding: '12px 14px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  notesLabel: {
    margin: '0 0 4px 0',
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  notesVal: {
    margin: 0,
    fontSize: '14px',
    color: '#d1d5db',
    lineHeight: '1.4',
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
  },
  editButton: {
    flex: 1,
    padding: '10px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#e5e7eb',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'background-color 0.2s',
  },
  deleteButton: {
    padding: '10px 16px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '12px',
    color: '#f87171',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  btnIcon: {
    width: '14px',
    height: '14px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  formTitle: {
    fontSize: '18px',
    fontWeight: '700',
    margin: 0,
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#f87171',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '12px',
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
    padding: '12px',
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
    padding: '12px',
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
  },
  segmentButtonActive: {
    background: '#3b82f6',
    color: '#ffffff',
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
  },
  ordersHeader: {
    width: '100%',
    maxWidth: '500px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    boxSizing: 'border-box',
  },
  ordersTitle: {
    fontSize: '20px',
    fontWeight: '700',
    margin: 0,
  },
  newOrderBtn: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
  },
  plusIcon: {
    fontSize: '16px',
  },
  ordersList: {
    width: '100%',
    maxWidth: '500px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxSizing: 'border-box',
  },
  emptyOrders: {
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '30px 20px',
    textAlign: 'center',
  },
  emptyOrdersText: {
    color: '#9ca3af',
    fontSize: '14px',
    margin: 0,
  },
  orderCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  orderCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tokenBadge: {
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(255, 255, 255, 0.08)',
    padding: '4px 8px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  tokenLabel: {
    fontSize: '8px',
    fontWeight: '600',
    color: '#9ca3af',
    letterSpacing: '0.5px',
  },
  tokenNum: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#3b82f6',
  },
  statusGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '6px',
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '3px 10px',
    borderRadius: '99px',
  },
  status_pending: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  status_ready: {
    background: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
    border: '1px solid rgba(59, 130, 246, 0.2)',
  },
  status_delivered: {
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#34d399',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  deadlineBadge: {
    fontSize: '11px',
    fontWeight: '500',
    padding: '2px 8px',
    borderRadius: '99px',
  },
  deadline_overdue: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  deadline_dueStr: {
    background: 'rgba(245, 158, 11, 0.15)',
    color: '#fbbf24',
    border: '1px solid rgba(245, 158, 11, 0.2)',
  },
  'deadline_due-soon': {
    background: 'rgba(245, 158, 11, 0.15)',
    color: '#fbbf24',
    border: '1px solid rgba(245, 158, 11, 0.2)',
  },
  deadline_upcoming: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#9ca3af',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  orderCardBody: {
    minWidth: 0,
  },
  garmentSummary: {
    margin: 0,
    fontSize: '14px',
    color: '#e5e7eb',
    fontWeight: '500',
    lineHeight: '1.4',
  },
  orderCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '10px',
  },
  pricingCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  pricingLabel: {
    fontSize: '10px',
    color: '#9ca3af',
    textTransform: 'uppercase',
  },
  pricingVal: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#f3f4f6',
  },
};

