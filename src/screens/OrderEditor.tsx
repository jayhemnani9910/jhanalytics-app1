import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { GarmentItemEditor } from '../components/GarmentItemEditor';
import { generateToken } from '../domain/token';
import { orderStatusRollup } from '../domain/status';
import { orderTotal, orderBalance } from '../domain/money';
import { createOrder, updateOrder } from '../firebase/repo';
import type { Order, OrderItem } from '../types';
import { usePhotos } from '../photos/usePhotos';

export function OrderEditor() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const t = useT();

  // Store data
  const customers = useStore((s) => s.customers);
  const orders = useStore((s) => s.orders);
  const templates = useStore((s) => s.templates);

  // Find order if editing
  const existingOrder = id ? orders.find((o) => o.id === id) : null;

  // Order fields
  const [customerId, setCustomerId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);

  // Page level states
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { compressAndSavePhoto, deletePhotoRef, resolvedUrls, resolvePhotos } = usePhotos();

  useEffect(() => {
    if (photos.length > 0) {
      resolvePhotos(photos);
    }
  }, [photos, resolvePhotos]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const localRef = await compressAndSavePhoto(file);
        setPhotos((prev) => [...prev, localRef]);
      } catch (err) {
        console.error('Failed to compress and save photo:', err);
      }
    }
  };

  const handleDeletePhoto = async (photoRef: string) => {
    const updatedPhotos = photos.filter((p) => p !== photoRef);
    setPhotos(updatedPhotos);
    await deletePhotoRef(photoRef, id, photos);
  };

  // Initialize fields
  useEffect(() => {
    if (existingOrder) {
      setCustomerId(existingOrder.customerId);
      setDeadline(existingOrder.deadline);
      setAdvancePaid(existingOrder.advancePaid ?? 0);
      setNotes(existingOrder.notes ?? '');
      setItems(existingOrder.items);
      setPhotos(existingOrder.photos ?? []);
    } else {
      const qCustId = searchParams.get('customerId');
      if (qCustId) {
        setCustomerId(qCustId);
      }
    }
  }, [existingOrder, searchParams]);

  // Selected customer info
  const currentCustomer = customers.find((c) => c.id === customerId);
  const customerOrders = orders.filter((o) => o.customerId === customerId);

  // Sort customers alphabetically for selection
  const sortedCustomers = [...customers].sort((a, b) =>
    a.nameLower.localeCompare(b.nameLower)
  );

  // Live total & balance calculation
  const mockOrder: Order = {
    id: id || 'new-mock',
    tokenNo: existingOrder?.tokenNo || '0000',
    customerId,
    deadline,
    items,
    advancePaid: advancePaid || undefined,
    notes: notes || undefined,
    photos,
    createdAt: existingOrder?.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  const totalBill = orderTotal(mockOrder);
  const balanceDue = orderBalance(mockOrder);

  // Add new blank item
  const handleAddItem = () => {
    const newItem: OrderItem = {
      itemId: crypto.randomUUID(),
      garmentType: '',
      templateId: null,
      quantity: 1,
      measurements: [],
      price: 0,
      status: 'pending',
    };
    setItems([...items, newItem]);
  };

  // Update item state
  const handleItemChange = (index: number, updatedItem: OrderItem) => {
    const newItems = [...items];
    newItems[index] = updatedItem;
    setItems(newItems);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      setFormError('Please select a customer.');
      return;
    }
    if (!deadline) {
      setFormError(t('orders.requiredDeadline'));
      return;
    }
    if (items.length === 0) {
      setFormError(t('orders.requiredItem'));
      return;
    }

    setFormError('');
    setIsSaving(true);

    try {
      if (id) {
        // Edit order
        await updateOrder(id, {
          customerId,
          deadline,
          advancePaid: advancePaid || undefined,
          notes: notes || undefined,
          items,
          photos,
        });
      } else {
        // Create order, generate token
        const activeTokens = new Set(
          orders
            .filter((o) => orderStatusRollup(o.items) !== 'delivered')
            .map((o) => o.tokenNo)
        );
        const tokenNo = generateToken(activeTokens);

        await createOrder({
          tokenNo,
          customerId,
          deadline,
          advancePaid: advancePaid || undefined,
          notes: notes || undefined,
          items,
          photos,
        });
      }
      navigate(-1);
    } catch (err: any) {
      setFormError(err.message || 'Error saving order');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header section */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          ← {t('common.cancel')}
        </button>
        <h1 style={styles.title}>
          {id ? t('orders.editTitle') : t('orders.newTitle')}
        </h1>
      </div>

      <form onSubmit={handleSave} style={styles.form}>
        {formError && <div style={styles.errorBanner}>{formError}</div>}

        {/* Customer selection */}
        <div style={styles.sectionCard}>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t('orders.customer')} *</label>
            {existingOrder ? (
              <div style={styles.lockedCustomer}>
                <span style={styles.lockedCustomerName}>{currentCustomer?.name}</span>
                <span style={styles.lockedCustomerLabel}>Locked</span>
              </div>
            ) : (
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                style={styles.select}
                required
              >
                <option value="">-- {t('orders.selectCustomer')} --</option>
                {sortedCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Order Meta details */}
        <div style={styles.sectionCard}>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t('orders.deadline')} *</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{t('orders.advance')}</label>
            <input
              type="number"
              min="0"
              value={advancePaid || ''}
              onChange={(e) => setAdvancePaid(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="0"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{t('orders.notes')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Order-level instructions..."
              style={styles.textarea}
              rows={2}
            />
          </div>
        </div>

        {/* Garment Items list */}
        <div style={styles.itemsHeader}>
          <h2 style={styles.itemsTitle}>{t('orders.items')}</h2>
          <button type="button" onClick={handleAddItem} style={styles.addItemBtn}>
            + {t('orders.addItem')}
          </button>
        </div>

        <div style={styles.itemsList}>
          {items.length === 0 ? (
            <div style={styles.emptyItems}>
              <p style={styles.emptyItemsText}>{t('orders.requiredItem')}</p>
            </div>
          ) : (
            items.map((item, index) => (
              <GarmentItemEditor
                key={item.itemId}
                item={item}
                onChange={(updatedItem) => handleItemChange(index, updatedItem)}
                onRemove={() => handleRemoveItem(index)}
                templates={templates}
                customerOrders={customerOrders}
                genderPreference={currentCustomer?.gender}
              />
            ))
          )}
        </div>

        {/* Photos Section */}
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>{t('orders.photos')}</h3>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} style={styles.addPhotoBtn}>
            📷 {t('orders.addPhoto')}
          </button>

          {photos.length > 0 ? (
            <div style={styles.photosGrid}>
              {photos.map((photo, index) => {
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
                      onClick={() => handleDeletePhoto(photo)}
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

        {/* Pricing Summary */}
        <div style={styles.pricingSummaryCard}>
          <div style={styles.pricingRow}>
            <span style={styles.pricingLabel}>{t('orders.total')}</span>
            <span style={styles.pricingVal}>₹{totalBill}</span>
          </div>
          <div style={styles.pricingRow}>
            <span style={styles.pricingLabel}>Advance Paid</span>
            <span style={styles.pricingVal}>- ₹{advancePaid}</span>
          </div>
          <div style={{ ...styles.pricingRow, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
            <span style={{ ...styles.pricingLabel, fontWeight: '700', color: '#ffffff' }}>
              {t('orders.balance')}
            </span>
            <span
              style={{
                ...styles.pricingVal,
                fontWeight: '700',
                color: balanceDue > 0 ? '#fbbf24' : '#10b981',
              }}
            >
              ₹{balanceDue}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button type="submit" style={styles.saveButton} disabled={isSaving}>
          {isSaving ? '...' : t('common.save')}
        </button>
      </form>
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
    alignItems: 'center',
    width: '100%',
    maxWidth: '500px',
    marginBottom: '20px',
    position: 'relative',
    boxSizing: 'border-box',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    position: 'absolute',
    left: 0,
    padding: '4px 0',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    margin: '0 auto',
    color: '#ffffff',
  },
  form: {
    width: '100%',
    maxWidth: '500px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxSizing: 'border-box',
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    color: '#f87171',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '13px',
  },
  sectionCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '16px',
    boxSizing: 'border-box',
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
    fontSize: '13px',
    fontWeight: '600',
    color: '#9ca3af',
  },
  select: {
    width: '100%',
    padding: '12px',
    background: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: '"Inter", sans-serif',
  },
  lockedCustomer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  lockedCustomerName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#e5e7eb',
  },
  lockedCustomerLabel: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    background: 'rgba(255,255,255,0.05)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  input: {
    width: '100%',
    padding: '12px',
    background: '#111827',
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
    background: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'none',
    fontFamily: '"Inter", sans-serif',
  },
  itemsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
  },
  itemsTitle: {
    fontSize: '18px',
    fontWeight: '700',
    margin: 0,
  },
  addItemBtn: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  emptyItems: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px dashed rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '32px 16px',
    textAlign: 'center',
  },
  emptyItemsText: {
    margin: 0,
    fontSize: '14px',
    color: '#6b7280',
  },
  pricingSummaryCard: {
    background: 'rgba(0,0,0,0.25)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '16px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  pricingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingLabel: {
    fontSize: '13px',
    color: '#9ca3af',
  },
  pricingVal: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#f3f4f6',
  },
  saveButton: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
    marginTop: '12px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 12px 0',
  },
  addPhotoBtn: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    alignSelf: 'flex-start',
    marginBottom: '12px',
  },
  photosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginTop: '12px',
  },
  photoContainer: {
    position: 'relative',
    aspectRatio: '1',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  photoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    background: 'rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    boxSizing: 'border-box',
  },
  photoPlaceholderText: {
    fontSize: '9px',
    color: '#9ca3af',
    textAlign: 'center',
  },
  emptyPhotos: {
    padding: '16px 0',
    textAlign: 'center',
    background: 'rgba(0,0,0,0.1)',
    borderRadius: '12px',
  },
  emptyPhotosText: {
    fontSize: '13px',
    color: '#6b7280',
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'rgba(239, 68, 68, 0.85)',
    border: 'none',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
};
