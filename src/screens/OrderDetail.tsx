import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { orderStatusRollup, nextBulkStatus, setAllItemsStatus } from '../domain/status';
import { orderTotal, orderBalance } from '../domain/money';
import { deadlineBucket, todayStr } from '../domain/deadline';
import { buildTelHref, buildWhatsAppHref } from '../domain/contact';
import { updateOrder, deleteOrder } from '../firebase/repo';
import type { OrderStatus } from '../types';
import { usePhotos } from '../photos/usePhotos';

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT();

  // Store data
  const orders = useStore((s) => s.orders);
  const customers = useStore((s) => s.customers);

  // Find order & associated customer
  const order = orders.find((o) => o.id === id);
  const customer = order ? customers.find((c) => c.id === order.customerId) : null;

  // Local UI States
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  const { deletePhotoRef, resolvedUrls, resolvePhotos } = usePhotos();

  useEffect(() => {
    if (order?.photos) {
      resolvePhotos(order.photos);
    }
  }, [order?.photos, resolvePhotos]);

  if (!order) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <h2 style={styles.errorTitle}>Order Not Found</h2>
          <p style={styles.errorText}>The order you are trying to view does not exist or has been deleted.</p>
          <button style={styles.backBtnInline} onClick={() => navigate(-1)}>
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  // Derived attributes
  const rollupStatus = orderStatusRollup(order.items);
  const nextStatus = nextBulkStatus(rollupStatus);
  const total = orderTotal(order);
  const balance = orderBalance(order);
  const bucket = deadlineBucket(order.deadline, todayStr(), rollupStatus);

  // Status colors & translation helpers
  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return t('orders.status.pending');
      case 'ready':
        return t('orders.status.ready');
      case 'delivered':
        return t('orders.status.delivered');
      default:
        return status;
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'var(--warning)';
      case 'ready':
        return 'var(--accent)';
      case 'delivered':
        return 'var(--success)';
      default:
        return 'var(--text-muted)';
    }
  };

  const getBucketLabel = (b: string) => {
    switch (b) {
      case 'overdue':
        return t('dashboard.overdue');
      case 'due-soon':
        return t('dashboard.dueSoon');
      case 'upcoming':
        return t('orders.upcoming');
      default:
        return b;
    }
  };

  const getBucketColor = (b: string) => {
    switch (b) {
      case 'overdue':
        return 'var(--danger)';
      case 'due-soon':
        return 'var(--warning)';
      case 'upcoming':
        return 'var(--success)';
      default:
        return 'var(--text-muted)';
    }
  };

  // Click handler to update garment status
  const handleItemStatusChange = async (itemId: string, newStatus: OrderStatus) => {
    if (updatingItemId) return;
    setUpdatingItemId(itemId);
    setError('');

    try {
      const updatedItems = order.items.map((item) => {
        if (item.itemId === itemId) {
          return { ...item, status: newStatus };
        }
        return item;
      });

      await updateOrder(order.id, {
        items: updatedItems,
      });
    } catch (err: any) {
      setError(err.message || t('orders.updateStatusError'));
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Click handler to update all items status at once
  const handleBulkStatusChange = async (newStatus: OrderStatus) => {
    if (updatingItemId) return;
    setUpdatingItemId('bulk');
    setError('');

    try {
      const updatedItems = setAllItemsStatus(order.items, newStatus);
      await updateOrder(order.id, {
        items: updatedItems,
      });
    } catch (err: any) {
      setError(err.message || t('orders.updateStatusError'));
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Click handler to delete order
  const handleDeleteOrder = async () => {
    setIsDeleting(true);
    setError('');

    try {
      await deleteOrder(order.id);
      navigate(-1);
    } catch (err: any) {
      setError(err.message || t('orders.deleteError'));
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  // Generate initials avatar
  const initials = customer
    ? customer.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          ← {t('common.cancel')}
        </button>
        <h1 style={styles.title}>{t('orders.detailTitle')}</h1>
        <button
          style={styles.editBtn}
          onClick={() => navigate(`/orders/${order.id}/edit`)}
        >
          {t('customers.edit')}
        </button>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={styles.contentLayout}>
        {/* Prominent Token & Global Status Card */}
        <div style={styles.tokenCard}>
          <div style={styles.tokenLabelContainer}>
            <span style={styles.tokenBadgeLabel}>{t('orders.token')}</span>
            <div
              style={{
                ...styles.statusDot,
                backgroundColor: getStatusColor(rollupStatus),
              }}
            />
            <span style={{ ...styles.statusText, color: getStatusColor(rollupStatus) }}>
              {getStatusText(rollupStatus)}
            </span>
          </div>
          <h2 style={styles.tokenNumber}>#{order.tokenNo}</h2>

          {/* Pricing quick info */}
          <div style={styles.quickPricingBar}>
            <div style={styles.quickPricingCol}>
              <span style={styles.quickPricingLabel}>{t('orders.total')}</span>
              <span style={styles.quickPricingValue}>₹{total}</span>
            </div>
            <div style={styles.quickPricingDivider} />
            <div style={styles.quickPricingCol}>
              <span style={styles.quickPricingLabel}>{t('orders.balance')}</span>
              <span
                style={{
                  ...styles.quickPricingValue,
                  color: balance > 0 ? 'var(--warning)' : 'var(--success)',
                }}
              >
                ₹{balance}
              </span>
            </div>
          </div>
        </div>

        {nextStatus && (
          <button
            type="button"
            disabled={!!updatingItemId}
            onClick={() => handleBulkStatusChange(nextStatus)}
            style={{
              ...styles.bulkStatusBtn,
              backgroundColor: getStatusColor(nextStatus),
              color: '#ffffff',
              opacity: updatingItemId ? 0.7 : 1,
            }}
          >
            {nextStatus === 'ready' ? t('orders.markReady') : t('orders.markDelivered')}
          </button>
        )}

        {/* Customer Information Card */}
        <div
          style={styles.infoCard}
          onClick={() => customer && navigate(`/customers/${customer.id}`)}
        >
          <div style={styles.customerHeader}>
            <div style={styles.avatar}>{initials}</div>
            <div style={styles.customerMeta}>
              <h3 style={styles.customerName}>{customer ? customer.name : 'Unknown Customer'}</h3>
              {customer?.phone && (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '4px' }}>
                  <a
                    href={buildTelHref(customer.phone)}
                    onClick={(e) => e.stopPropagation()}
                    style={styles.phoneLink}
                  >
                    📞 {customer.phone}
                  </a>
                  <a
                    href={buildWhatsAppHref(customer.phone, t('contact.readyMessage'))}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={styles.waLink}
                  >
                    💬 WhatsApp
                  </a>
                </div>
              )}
            </div>
          </div>

          <div style={styles.deadlineRow}>
            <div style={styles.deadlineCol}>
              <span style={styles.infoCardLabel}>{t('orders.deadline')}</span>
              <span style={styles.deadlineDate}>{order.deadline}</span>
            </div>
            <div
              style={{
                ...styles.bucketBadge,
                backgroundColor: `color-mix(in srgb, ${getBucketColor(bucket)} 8%, transparent)`,
                border: `1px solid color-mix(in srgb, ${getBucketColor(bucket)} 20%, transparent)`,
                color: getBucketColor(bucket),
              }}
            >
              {getBucketLabel(bucket)}
            </div>
          </div>
        </div>

        {/* Garment Items List */}
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>{t('orders.items')} ({order.items.length})</h3>
        </div>

        <div style={styles.itemsList}>
          {order.items.map((item) => {
            const itemTotal = (item.quantity || 1) * (item.price || 0);

            return (
              <div key={item.itemId} data-testid={`garment-card-${item.garmentType || 'custom'}`} style={styles.garmentCard}>
                {/* Garment Type & Pricing header */}
                <div style={styles.garmentHeader}>
                  <div style={styles.garmentTypeInfo}>
                    <h4 style={styles.garmentType}>
                      {item.garmentType || t('orders.customGarment')}
                    </h4>
                    <span style={styles.garmentQtyPrice}>
                      {item.quantity} × ₹{item.price || 0}
                    </span>
                  </div>
                  <span style={styles.garmentTotal}>₹{itemTotal}</span>
                </div>

                {/* Per-Item Status Stepper */}
                <div style={styles.stepperContainer}>
                  <span style={styles.stepperLabel}>Status</span>
                  <div style={styles.stepperPills}>
                    {(['pending', 'ready', 'delivered'] as OrderStatus[]).map((status) => {
                      const isActive = item.status === status;
                      const activeColor = getStatusColor(status);
                      const isWorking = updatingItemId === item.itemId;

                      return (
                        <button
                          key={status}
                          disabled={isWorking}
                          onClick={() => handleItemStatusChange(item.itemId, status)}
                          style={{
                            ...styles.stepperButton,
                            backgroundColor: isActive ? activeColor : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isActive ? activeColor : 'rgba(255,255,255,0.08)'}`,
                            color: isActive ? '#ffffff' : '#9ca3af',
                            opacity: isWorking ? 0.6 : 1,
                          }}
                        >
                          {getStatusText(status)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Measurements Grid */}
                <div style={styles.measurementsSection}>
                  <h5 style={styles.measurementsTitle}>{t('orders.measurements')}</h5>
                  {item.measurements.length === 0 ? (
                    <p style={styles.emptyMeasurements}>No measurements saved.</p>
                  ) : (
                    <div style={styles.measurementsGrid}>
                      {item.measurements.map((row, idx) => (
                        <div key={row.fieldId || `${row.label}-${idx}`} style={styles.measurementCell}>
                          <span style={styles.mLabel}>{row.label}</span>
                          <span style={styles.mValue}>
                            {row.value || '—'} {row.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Order level notes */}
        {order.notes && (
          <div style={styles.notesCard}>
            <span style={styles.notesLabel}>{t('orders.notes')}</span>
            <p style={styles.notesText}>{order.notes}</p>
          </div>
        )}

        {/* Photos Section */}
        <div style={styles.photosSectionCard}>
          <h4 style={styles.photosTitle}>{t('orders.photos')}</h4>
          {order.photos && order.photos.length > 0 ? (
            <div style={styles.photosGrid}>
              {order.photos.map((photo, index) => {
                const displayUrl = resolvedUrls[photo];
                return (
                  <div key={index} style={styles.photoContainer}>
                    {displayUrl ? (
                      <img
                        src={displayUrl}
                        alt={`Garment ${index + 1}`}
                        style={styles.photoImg}
                      />
                    ) : (
                      <div style={styles.photoPlaceholder}>
                        <span style={styles.photoPlaceholderText}>Loading...</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => deletePhotoRef(photo, order.id, order.photos)}
                      style={styles.deletePhotoBtn}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.emptyPhotos}>
              <span style={styles.emptyPhotosText}>{t('orders.noPhotos')}</span>
            </div>
          )}
        </div>

        {/* Detailed Pricing Summary */}
        <div style={styles.summaryCard}>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>{t('orders.total')}</span>
            <span style={styles.summaryValue}>₹{total}</span>
          </div>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>{t('orders.advance')}</span>
            <span style={styles.summaryValue}>- ₹{order.advancePaid || 0}</span>
          </div>
          <div style={{ ...styles.summaryRow, borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '4px' }}>
            <span style={{ ...styles.summaryLabel, fontWeight: '700', color: 'var(--text)' }}>
              {t('orders.balance')}
            </span>
            <span
              style={{
                ...styles.summaryValue,
                fontWeight: '800',
                fontSize: 'calc(18px * var(--font-scale))',
                color: balance > 0 ? 'var(--warning)' : 'var(--success)',
              }}
            >
              ₹{balance}
            </span>
          </div>
        </div>

        {/* Delete Confirmation Block */}
        <div style={styles.dangerZone}>
          {confirmDelete ? (
            <div style={styles.confirmDeleteBox}>
              <p style={styles.confirmDeleteText}>{t('orders.deleteConfirm')}</p>
              <div style={styles.confirmActions}>
                <button
                  disabled={isDeleting}
                  onClick={handleDeleteOrder}
                  style={styles.deleteConfirmBtn}
                >
                  {isDeleting ? '...' : 'Yes, Delete'}
                </button>
                <button
                  disabled={isDeleting}
                  onClick={() => setConfirmDelete(false)}
                  style={styles.deleteCancelBtn}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button style={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>
              🗑️ {t('orders.delete')}
            </button>
          )}
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
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: '500px',
    marginBottom: '20px',
    position: 'relative',
    boxSizing: 'border-box',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: 'calc(15px * var(--font-scale))',
    fontWeight: '600',
    padding: '4px 0',
  },
  title: {
    fontSize: 'calc(20px * var(--font-scale))',
    fontWeight: '700',
    margin: 0,
    color: 'var(--text)',
  },
  editBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent)',
    cursor: 'pointer',
    fontSize: 'calc(15px * var(--font-scale))',
    fontWeight: '600',
    padding: '4px 0',
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid var(--danger)',
    color: 'var(--danger)',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: 'calc(13px * var(--font-scale))',
    width: '100%',
    maxWidth: '500px',
    boxSizing: 'border-box',
    marginBottom: '16px',
  },
  contentLayout: {
    width: '100%',
    maxWidth: '500px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxSizing: 'border-box',
  },
  tokenCard: {
    background: 'var(--surface)',
    backdropFilter: 'blur(10px)',
    border: '1px solid var(--border)',
    borderRadius: '24px',
    padding: '24px',
    textAlign: 'center',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
    boxSizing: 'border-box',
  },
  tokenLabelContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  tokenBadgeLabel: {
    fontSize: 'calc(13px * var(--font-scale))',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: 'calc(13px * var(--font-scale))',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  tokenNumber: {
    fontSize: 'calc(40px * var(--font-scale))',
    fontWeight: '800',
    margin: '0 0 16px 0',
    color: 'var(--text)',
    letterSpacing: '1px',
  },
  quickPricingBar: {
    display: 'flex',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    borderTop: '1px solid var(--border)',
    paddingTop: '16px',
  },
  quickPricingCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  quickPricingLabel: {
    fontSize: 'calc(11px * var(--font-scale))',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    marginBottom: '4px',
  },
  quickPricingValue: {
    fontSize: 'calc(18px * var(--font-scale))',
    fontWeight: '700',
  },
  quickPricingDivider: {
    width: '1px',
    height: '24px',
    background: 'var(--border)',
  },
  infoCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '16px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxSizing: 'border-box',
    transition: 'background 0.2s ease',
  },
  customerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'calc(16px * var(--font-scale))',
    fontWeight: '700',
    color: '#ffffff',
  },
  customerMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  customerName: {
    fontSize: 'calc(16px * var(--font-scale))',
    fontWeight: '600',
    margin: 0,
    color: 'var(--text)',
  },
  phoneLink: {
    fontSize: 'calc(13px * var(--font-scale))',
    color: 'var(--accent)',
    textDecoration: 'none',
    fontWeight: '500',
  },
  waLink: {
    fontSize: 'calc(13px * var(--font-scale))',
    color: 'var(--success)',
    textDecoration: 'none',
    fontWeight: '500',
  },
  deadlineRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--surface-2)',
    padding: '10px 12px',
    borderRadius: '12px',
  },
  deadlineCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  infoCardLabel: {
    fontSize: 'calc(11px * var(--font-scale))',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  deadlineDate: {
    fontSize: 'calc(14px * var(--font-scale))',
    fontWeight: '600',
    color: 'var(--text)',
  },
  bucketBadge: {
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: 'calc(11px * var(--font-scale))',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  sectionHeader: {
    marginTop: '8px',
    marginBottom: '2px',
  },
  sectionTitle: {
    fontSize: 'calc(15px * var(--font-scale))',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: 0,
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  garmentCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '16px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  garmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '12px',
  },
  garmentTypeInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  garmentType: {
    fontSize: 'calc(16px * var(--font-scale))',
    fontWeight: '700',
    margin: 0,
    color: 'var(--text)',
  },
  garmentQtyPrice: {
    fontSize: 'calc(13px * var(--font-scale))',
    color: 'var(--text-muted)',
  },
  garmentTotal: {
    fontSize: 'calc(16px * var(--font-scale))',
    fontWeight: '700',
    color: 'var(--text)',
  },
  stepperContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  stepperLabel: {
    fontSize: 'calc(11px * var(--font-scale))',
    color: 'var(--text-muted)',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  stepperPills: {
    display: 'flex',
    background: 'var(--surface-2)',
    borderRadius: '12px',
    padding: '3px',
    gap: '4px',
    boxSizing: 'border-box',
  },
  stepperButton: {
    flex: 1,
    padding: '8px 4px',
    border: 'none',
    borderRadius: '9px',
    fontSize: 'calc(12px * var(--font-scale))',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'center',
  },
  measurementsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  measurementsTitle: {
    fontSize: 'calc(12px * var(--font-scale))',
    fontWeight: '600',
    color: 'var(--text-muted)',
    margin: 0,
    textTransform: 'uppercase',
  },
  emptyMeasurements: {
    margin: 0,
    fontSize: 'calc(13px * var(--font-scale))',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  measurementsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  measurementCell: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '8px 10px',
  },
  mLabel: {
    fontSize: 'calc(12px * var(--font-scale))',
    color: 'var(--text-muted)',
  },
  mValue: {
    fontSize: 'calc(13px * var(--font-scale))',
    fontWeight: '600',
    color: 'var(--text)',
  },
  notesCard: {
    background: 'color-mix(in srgb, var(--warning) 5%, transparent)',
    border: '1px dashed color-mix(in srgb, var(--warning) 30%, transparent)',
    borderRadius: '16px',
    padding: '14px 16px',
    boxSizing: 'border-box',
  },
  notesLabel: {
    fontSize: 'calc(11px * var(--font-scale))',
    fontWeight: '600',
    color: 'var(--warning)',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '4px',
  },
  notesText: {
    margin: 0,
    fontSize: 'calc(13px * var(--font-scale))',
    color: 'var(--text)',
    lineHeight: '1.5',
  },
  photosSectionCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '16px',
    boxSizing: 'border-box',
  },
  photosTitle: {
    fontSize: 'calc(13px * var(--font-scale))',
    fontWeight: '700',
    color: 'var(--text-muted)',
    margin: '0 0 12px 0',
    textTransform: 'uppercase',
  },
  photosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  photoContainer: {
    position: 'relative',
    aspectRatio: '1',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid var(--border)',
  },
  photoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    background: 'var(--surface)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    boxSizing: 'border-box',
  },
  photoPlaceholderText: {
    fontSize: 'calc(9px * var(--font-scale))',
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  emptyPhotos: {
    padding: '24px 0',
    textAlign: 'center',
    background: 'var(--surface-2)',
    borderRadius: '12px',
  },
  emptyPhotosText: {
    fontSize: 'calc(13px * var(--font-scale))',
    color: 'var(--text-muted)',
  },
  summaryCard: {
    background: 'var(--surface-2)',
    borderRadius: '20px',
    border: '1px solid var(--border)',
    padding: '16px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 'calc(13px * var(--font-scale))',
    color: 'var(--text-muted)',
  },
  summaryValue: {
    fontSize: 'calc(15px * var(--font-scale))',
    fontWeight: '600',
    color: 'var(--text)',
  },
  bulkStatusBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '16px',
    fontSize: 'calc(16px * var(--font-scale))',
    fontWeight: '700',
    cursor: 'pointer',
    textAlign: 'center',
    border: 'none',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
    transition: 'all 0.2s',
  },
  dangerZone: {
    marginTop: '16px',
    boxSizing: 'border-box',
  },
  deleteBtn: {
    width: '100%',
    padding: '12px',
    background: 'color-mix(in srgb, var(--danger) 8%, transparent)',
    border: '1px solid color-mix(in srgb, var(--danger) 20%, transparent)',
    borderRadius: '12px',
    color: 'var(--danger)',
    fontSize: 'calc(14px * var(--font-scale))',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  confirmDeleteBox: {
    background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
    border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
    borderRadius: '16px',
    padding: '16px',
    textAlign: 'center',
  },
  confirmDeleteText: {
    fontSize: 'calc(13px * var(--font-scale))',
    color: 'var(--danger)',
    margin: '0 0 12px 0',
    fontWeight: '600',
  },
  confirmActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  deleteConfirmBtn: {
    background: 'var(--danger)',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    padding: '8px 16px',
    fontSize: 'calc(13px * var(--font-scale))',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteCancelBtn: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-muted)',
    padding: '8px 16px',
    fontSize: 'calc(13px * var(--font-scale))',
    fontWeight: '600',
    cursor: 'pointer',
  },
  errorCard: {
    width: '100%',
    maxWidth: '500px',
    background: 'var(--surface)',
    backdropFilter: 'blur(10px)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
    boxSizing: 'border-box',
    marginTop: '40px',
  },
  errorTitle: {
    fontSize: 'calc(20px * var(--font-scale))',
    fontWeight: '700',
    margin: '0 0 12px 0',
  },
  errorText: {
    fontSize: 'calc(14px * var(--font-scale))',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    margin: '0 0 20px 0',
  },
  backBtnInline: {
    background: 'var(--accent)',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    padding: '10px 20px',
    fontSize: 'calc(14px * var(--font-scale))',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'var(--danger)',
    border: 'none',
    color: '#ffffff',
    fontSize: 'calc(11px * var(--font-scale))',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
};
