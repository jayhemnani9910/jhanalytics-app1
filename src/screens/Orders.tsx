import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { orderTotal, orderBalance } from '../domain/money';
import { orderStatusRollup } from '../domain/status';
import { matchesQuery } from '../domain/search';

type FilterTab = 'active' | 'pending' | 'ready' | 'delivered' | 'all';
type SortOption = 'deadline' | 'created';

export function Orders() {
  const navigate = useNavigate();
  const t = useT();

  const orders = useStore((s) => s.orders);
  const customers = useStore((s) => s.customers);
  const ready = useStore((s) => s.ready);

  // Search, filter, sort and pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('active');
  const [sortBy, setSortBy] = useState<SortOption>('deadline');
  const [pageLimit, setPageLimit] = useState(30);

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

  // Process orders list
  const processedOrders = useMemo(() => {
    // 1. Filter by search query
    let result = orders.filter((order) => {
      const cust = customers.find((c) => c.id === order.customerId);
      const fields = {
        name: cust ? cust.name : '',
        phone: cust?.phone ?? '',
        token: order.tokenNo,
      };
      return matchesQuery(fields, searchQuery);
    });

    // 2. Filter by status tab
    result = result.filter((order) => {
      const rollup = orderStatusRollup(order.items);
      switch (activeTab) {
        case 'active':
          return rollup !== 'delivered';
        case 'pending':
          return rollup === 'pending';
        case 'ready':
          return rollup === 'ready';
        case 'delivered':
          return rollup === 'delivered';
        case 'all':
        default:
          return true;
      }
    });

    // 3. Sort
    result.sort((a, b) => {
      if (sortBy === 'deadline') {
        return a.deadline.localeCompare(b.deadline);
      } else {
        return b.createdAt - a.createdAt; // newest first
      }
    });

    return result;
  }, [orders, customers, searchQuery, activeTab, sortBy]);

  // Paginated subset
  const visibleOrders = useMemo(() => {
    return processedOrders.slice(0, pageLimit);
  }, [processedOrders, pageLimit]);

  if (!ready) {
    return (
      <div style={styles.container}>
        <div style={styles.loaderBox}>
          <div style={styles.spinner} />
          <span style={styles.loaderText}>Loading orders...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>{t('nav.orders')}</h1>
        <button
          onClick={() => navigate('/orders/new')}
          style={styles.newOrderBtn}
        >
          ➕ {t('common.newOrder')}
        </button>
      </div>

      <div style={styles.contentLayout}>
        {/* Search bar */}
        <div style={styles.searchWrapper}>
          <input
            type="text"
            placeholder={t('customers.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPageLimit(30); // reset page limit on search
            }}
            style={styles.searchInput}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={styles.clearSearchBtn}
            >
              ✕
            </button>
          )}
        </div>

        {/* Tab filters */}
        <div style={styles.tabsContainer}>
          {(['active', 'pending', 'ready', 'delivered', 'all'] as FilterTab[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setPageLimit(30); // reset page limit on tab change
                }}
                style={{
                  ...styles.tabButton,
                  background: isActive ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? '#3b82f6' : 'rgba(255,255,255,0.06)'}`,
                  color: isActive ? '#ffffff' : '#9ca3af',
                }}
              >
                {tab === 'active'
                  ? t('orders.active') || 'Active'
                  : tab === 'all'
                  ? t('orders.all') || 'All'
                  : t(`orders.status.${tab}`)}
              </button>
            );
          })}
        </div>

        {/* Sort options */}
        <div style={styles.sortContainer}>
          <span style={styles.sortLabel}>{t('orders.sortBy') || 'Sort by'}:</span>
          <div style={styles.sortButtons}>
            <button
              onClick={() => setSortBy('deadline')}
              style={{
                ...styles.sortBtn,
                background: sortBy === 'deadline' ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderColor: sortBy === 'deadline' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: sortBy === 'deadline' ? '#ffffff' : '#9ca3af',
              }}
            >
              📅 {t('orders.sortByDeadline') || 'Deadline'}
            </button>
            <button
              onClick={() => setSortBy('created')}
              style={{
                ...styles.sortBtn,
                background: sortBy === 'created' ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderColor: sortBy === 'created' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: sortBy === 'created' ? '#ffffff' : '#9ca3af',
              }}
            >
              🆕 {t('orders.sortByCreated') || 'Date Created'}
            </button>
          </div>
        </div>

        {/* Orders list */}
        <div style={styles.ordersList}>
          {visibleOrders.length === 0 ? (
            <div style={styles.emptyCard}>
              <span style={styles.emptyIcon}>📦</span>
              <p style={styles.emptyText}>{t('orders.noOrders') || 'No orders found.'}</p>
            </div>
          ) : (
            visibleOrders.map((order) => {
              const rollup = orderStatusRollup(order.items);
              const total = orderTotal(order);
              const balance = orderBalance(order);

              return (
                <div
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  style={styles.orderCard}
                >
                  <div style={styles.cardHeader}>
                    <div style={styles.tokenSection}>
                      <span style={styles.tokenText}>#{order.tokenNo}</span>
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
                        {t(`orders.status.${rollup}`)}
                      </span>
                    </div>
                    <span style={styles.cardPrice}>₹{total}</span>
                  </div>

                  <div style={styles.cardBody}>
                    <h3 style={styles.custName}>{getCustomerName(order.customerId)}</h3>
                    <p style={styles.garmentsText}>{getItemSummary(order.items)}</p>
                  </div>

                  <div style={styles.cardFooter}>
                    <span style={styles.deadline}>📅 {order.deadline}</span>
                    {balance > 0 && (
                      <span style={styles.balanceDue}>
                        {t('orders.balance')}: <strong style={{ color: '#fbbf24' }}>₹{balance}</strong>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Load more button */}
        {processedOrders.length > pageLimit && (
          <button
            onClick={() => setPageLimit((prev) => prev + 30)}
            style={styles.loadMoreBtn}
          >
            {t('orders.loadMore') || 'Load More'}
          </button>
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
    width: '100%',
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
    fontSize: '24px',
    fontWeight: '800',
    margin: 0,
  },
  newOrderBtn: {
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
  contentLayout: {
    width: '100%',
    maxWidth: '500px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxSizing: 'border-box',
  },
  searchWrapper: {
    position: 'relative',
    width: '100%',
  },
  searchInput: {
    width: '100%',
    padding: '12px 40px 12px 14px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: '"Inter", sans-serif',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '14px',
  },
  tabsContainer: {
    display: 'flex',
    overflowX: 'auto',
    gap: '6px',
    paddingBottom: '4px',
    scrollbarWidth: 'none', // hide on firefox
    boxSizing: 'border-box',
  },
  tabButton: {
    padding: '8px 14px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  sortContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.15)',
    padding: '10px 12px',
    borderRadius: '12px',
  },
  sortLabel: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '600',
  },
  sortButtons: {
    display: 'flex',
    gap: '6px',
  },
  sortBtn: {
    padding: '6px 12px',
    border: '1px solid transparent',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  orderCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '20px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokenSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  tokenText: {
    fontSize: '16px',
    fontWeight: '800',
    color: '#ffffff',
  },
  statusBadge: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '6px',
  },
  cardPrice: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#ffffff',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  custName: {
    fontSize: '16px',
    fontWeight: '700',
    margin: 0,
    color: '#f3f4f6',
  },
  garmentsText: {
    fontSize: '13px',
    color: '#9ca3af',
    margin: 0,
    lineHeight: '1.4',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    paddingTop: '10px',
  },
  deadline: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '500',
  },
  balanceDue: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  loadMoreBtn: {
    width: '100%',
    padding: '12px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
  emptyCard: {
    background: 'rgba(0,0,0,0.15)',
    border: '1px dashed rgba(255,255,255,0.08)',
    borderRadius: '20px',
    padding: '48px 16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  emptyIcon: {
    fontSize: '36px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
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
