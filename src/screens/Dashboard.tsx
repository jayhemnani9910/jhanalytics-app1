import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { bucketOrders } from '../domain/dashboard';
import { todayStr } from '../domain/deadline';
import { orderTotal, orderBalance } from '../domain/money';
import { orderStatusRollup } from '../domain/status';

export function Dashboard() {
  const navigate = useNavigate();
  const t = useT();

  const orders = useStore((s) => s.orders);
  const customers = useStore((s) => s.customers);
  const ready = useStore((s) => s.ready);

  const today = todayStr();
  const buckets = bucketOrders(orders, today);

  // Helper to find customer name
  const getCustomerName = (customerId: string) => {
    const cust = customers.find((c) => c.id === customerId);
    return cust ? cust.name : 'Unknown';
  };

  // Helper to summarize items
  const getItemSummary = (items: any[]) => {
    if (!items || items.length === 0) return 'No garments';
    return items.map((i) => `${i.quantity} × ${i.garmentType}`).join(', ');
  };

  // Section card list component
  const OrderSection = ({
    title,
    ordersList,
    themeColor,
  }: {
    title: string;
    ordersList: any[];
    themeColor: { bg: string; text: string; border: string };
  }) => {
    if (ordersList.length === 0) return null;

    return (
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={{ ...styles.sectionTitle, color: themeColor.text }}>{title}</h2>
          <span style={{ ...styles.countBadge, background: themeColor.bg, color: themeColor.text }}>
            {ordersList.length}
          </span>
        </div>
        <div style={styles.sectionGrid}>
          {ordersList.map((order) => {
            const total = orderTotal(order);
            const balance = orderBalance(order);

            return (
              <div
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                style={{
                  ...styles.orderCard,
                  borderColor: themeColor.border,
                }}
              >
                <div style={styles.cardTop}>
                  <div style={styles.tokenBox}>
                    <span style={styles.tokenLabel}>TOKEN</span>
                    <span style={styles.tokenValue}>#{order.tokenNo}</span>
                  </div>
                  <div style={styles.deadlineBox}>
                    <span style={styles.deadlineLabel}>{t('orders.deadline')}</span>
                    <span style={styles.deadlineValue}>{order.deadline}</span>
                  </div>
                </div>

                <div style={styles.cardMid}>
                  <h3 style={styles.customerName}>{getCustomerName(order.customerId)}</h3>
                  <p style={styles.garmentSummary}>{getItemSummary(order.items)}</p>
                </div>

                <div style={styles.cardBottom}>
                  <div style={styles.priceMeta}>
                    <span style={styles.priceLabel}>{t('orders.total')}:</span>
                    <span style={styles.priceValue}>₹{total}</span>
                  </div>
                  {balance > 0 && (
                    <div style={styles.priceMeta}>
                      <span style={styles.priceLabel}>{t('orders.balance')}:</span>
                      <span style={{ ...styles.priceValue, color: '#fbbf24' }}>₹{balance}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!ready) {
    return (
      <div style={styles.container}>
        <div style={styles.loaderBox}>
          <div style={styles.spinner} />
          <span style={styles.loaderText}>Loading dashboard data...</span>
        </div>
      </div>
    );
  }

  const hasAnyActiveWork =
    buckets.overdue.length > 0 ||
    buckets.dueSoon.length > 0 ||
    buckets.ready.length > 0 ||
    buckets.balanceDue.length > 0;

  return (
    <div style={styles.container}>
      <div style={styles.scrollContent}>
        {/* Hero Welcome banner */}
        <div style={styles.welcomeBanner}>
          <div style={styles.welcomeLeft}>
            <h1 style={styles.shopTitle}>Pareshbhai Tailor</h1>
            <p style={styles.shopSubtitle}>Tailor Measurement & Order Sync</p>
          </div>
          <button
            onClick={() => navigate('/orders/new')}
            style={styles.newOrderBtnHeader}
          >
            ➕ {t('common.newOrder')}
          </button>
        </div>

        {/* Priority Sections */}
        <OrderSection
          title={t('dashboard.overdue')}
          ordersList={buckets.overdue}
          themeColor={{
            bg: 'rgba(239, 68, 68, 0.15)',
            text: '#ef4444',
            border: 'rgba(239, 68, 68, 0.25)',
          }}
        />

        <OrderSection
          title={t('dashboard.dueSoon')}
          ordersList={buckets.dueSoon}
          themeColor={{
            bg: 'rgba(245, 158, 11, 0.15)',
            text: '#f59e0b',
            border: 'rgba(245, 158, 11, 0.25)',
          }}
        />

        <OrderSection
          title={t('dashboard.ready')}
          ordersList={buckets.ready}
          themeColor={{
            bg: 'rgba(139, 92, 246, 0.15)',
            text: '#8b5cf6',
            border: 'rgba(139, 92, 246, 0.25)',
          }}
        />

        <OrderSection
          title={t('dashboard.balanceDue')}
          ordersList={buckets.balanceDue}
          themeColor={{
            bg: 'rgba(251, 191, 36, 0.15)',
            text: '#fbbf24',
            border: 'rgba(251, 191, 36, 0.25)',
          }}
        />

        {/* Fallback banner if all priority queues are cleared */}
        {!hasAnyActiveWork && (
          <div style={styles.clearedBanner}>
            <span style={styles.clearedIcon}>🎉</span>
            <h3 style={styles.clearedTitle}>All Clear!</h3>
            <p style={styles.clearedSubtitle}>
              No overdue, due-soon, or outstanding orders. Great job!
            </p>
          </div>
        )}

        {/* Recent Orders Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitleNormal}>{t('dashboard.recent')}</h2>
            <span style={styles.countBadgeNormal}>{buckets.recent.length}</span>
          </div>
          {buckets.recent.length === 0 ? (
            <div style={styles.emptyRecentCard}>
              <p style={styles.emptyRecentText}>No orders captured in the system yet.</p>
              <button
                onClick={() => navigate('/orders/new')}
                style={styles.inlineActionBtn}
              >
                Create First Order
              </button>
            </div>
          ) : (
            <div style={styles.sectionGrid}>
              {buckets.recent.map((order) => {
                const rollup = orderStatusRollup(order.items);
                const total = orderTotal(order);

                return (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    style={styles.recentOrderCard}
                  >
                    <div style={styles.recentCardTop}>
                      <span style={styles.recentToken}>#{order.tokenNo}</span>
                      <span
                        style={{
                          ...styles.statusBadge,
                          background:
                            rollup === 'delivered'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : rollup === 'ready'
                              ? 'rgba(139, 92, 246, 0.15)'
                              : 'rgba(245, 158, 11, 0.15)',
                          color:
                            rollup === 'delivered'
                              ? '#10b981'
                              : rollup === 'ready'
                              ? '#8b5cf6'
                              : '#f59e0b',
                        }}
                      >
                        {rollup}
                      </span>
                    </div>
                    <h3 style={styles.recentCustName}>{getCustomerName(order.customerId)}</h3>
                    <p style={styles.recentSummary}>{getItemSummary(order.items)}</p>
                    <div style={styles.recentCardFooter}>
                      <span style={styles.recentDeadline}>📅 {order.deadline}</span>
                      <span style={styles.recentPrice}>₹{total}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/orders/new')}
        style={styles.fabBtn}
        aria-label="Create new order"
      >
        ➕
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '0 0 88px 0',
    minHeight: '100vh',
    background: 'radial-gradient(circle at top right, #1f2937, #111827)',
    color: '#ffffff',
    fontFamily: '"Inter", "Noto Sans Gujarati", sans-serif',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
  scrollContent: {
    width: '100%',
    maxWidth: '500px',
    padding: '24px 16px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  welcomeBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '20px',
    boxSizing: 'border-box',
  },
  welcomeLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  shopTitle: {
    fontSize: '22px',
    fontWeight: '800',
    margin: 0,
    background: 'linear-gradient(135deg, #c084fc, #a855f7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  shopSubtitle: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: 0,
    fontWeight: '500',
  },
  newOrderBtnHeader: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingLeft: '4px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: 0,
  },
  sectionTitleNormal: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: 0,
  },
  countBadge: {
    fontSize: '11px',
    fontWeight: '800',
    padding: '3px 8px',
    borderRadius: '8px',
  },
  countBadgeNormal: {
    fontSize: '11px',
    fontWeight: '800',
    padding: '3px 8px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.08)',
    color: '#9ca3af',
  },
  sectionGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  orderCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(8px)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: '20px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    cursor: 'pointer',
    boxSizing: 'border-box',
    transition: 'transform 0.2s ease, background 0.2s ease',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokenBox: {
    display: 'flex',
    flexDirection: 'column',
  },
  tokenLabel: {
    fontSize: '9px',
    color: '#9ca3af',
    fontWeight: '600',
    letterSpacing: '0.3px',
  },
  tokenValue: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#ffffff',
  },
  deadlineBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  deadlineLabel: {
    fontSize: '9px',
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  deadlineValue: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#e5e7eb',
  },
  cardMid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  customerName: {
    fontSize: '16px',
    fontWeight: '700',
    margin: 0,
    color: '#ffffff',
  },
  garmentSummary: {
    fontSize: '13px',
    color: '#9ca3af',
    margin: 0,
    lineHeight: '1.4',
  },
  cardBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    paddingTop: '12px',
  },
  priceMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  priceLabel: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  priceValue: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#ffffff',
  },
  clearedBanner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(16, 185, 129, 0.03)',
    border: '1px dashed rgba(16, 185, 129, 0.2)',
    borderRadius: '24px',
    padding: '32px 16px',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  clearedIcon: {
    fontSize: '36px',
    marginBottom: '12px',
  },
  clearedTitle: {
    fontSize: '18px',
    fontWeight: '700',
    margin: '0 0 6px 0',
    color: '#10b981',
  },
  clearedSubtitle: {
    fontSize: '13px',
    color: '#9ca3af',
    margin: 0,
    lineHeight: '1.4',
  },
  recentOrderCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '20px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  recentCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentToken: {
    fontSize: '15px',
    fontWeight: '800',
    color: '#ffffff',
  },
  statusBadge: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '6px',
    textTransform: 'capitalize',
  },
  recentCustName: {
    fontSize: '15px',
    fontWeight: '700',
    margin: 0,
    color: '#f3f4f6',
  },
  recentSummary: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: 0,
    lineHeight: '1.4',
  },
  recentCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    paddingTop: '10px',
  },
  recentDeadline: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '500',
  },
  recentPrice: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyRecentCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px dashed rgba(255,255,255,0.08)',
    borderRadius: '20px',
    padding: '32px 16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  emptyRecentText: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0,
  },
  inlineActionBtn: {
    background: '#3b82f6',
    border: 'none',
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  fabBtn: {
    position: 'fixed',
    bottom: '96px',
    right: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '28px',
    background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    color: '#ffffff',
    border: 'none',
    fontSize: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)',
    zIndex: 999,
  },
  loaderBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    marginTop: '80px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loaderText: {
    fontSize: '14px',
    color: '#9ca3af',
  },
};
