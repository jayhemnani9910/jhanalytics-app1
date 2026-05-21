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
                  background: isActive ? 'linear-gradient(135deg, var(--accent), var(--accent))' : 'var(--surface-2)',
                  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
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
                background: sortBy === 'deadline' ? 'var(--surface)' : 'transparent',
                borderColor: sortBy === 'deadline' ? 'var(--border)' : 'transparent',
                color: sortBy === 'deadline' ? 'var(--text)' : 'var(--text-muted)',
              }}
            >
              📅 {t('orders.sortByDeadline') || 'Deadline'}
            </button>
            <button
              onClick={() => setSortBy('created')}
              style={{
                ...styles.sortBtn,
                background: sortBy === 'created' ? 'var(--surface)' : 'transparent',
                borderColor: sortBy === 'created' ? 'var(--border)' : 'transparent',
                color: sortBy === 'created' ? 'var(--text)' : 'var(--text-muted)',
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
                              ? 'rgba(59, 130, 246, 0.15)'
                              : 'rgba(245, 158, 11, 0.15)',
                          color:
                            rollup === 'delivered'
                              ? 'var(--success)'
                              : rollup === 'ready'
                              ? 'var(--accent)'
                              : 'var(--warning)',
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
                        {t('orders.balance')}: <strong style={{ color: 'var(--warning)' }}>₹{balance}</strong>
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
    background: 'var(--bg)',
    color: 'var(--text)',
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
    fontSize: 'calc(24px * var(--font-scale))',
    fontWeight: '800',
    margin: 0,
  },
  newOrderBtn: {
    background: 'var(--accent)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 16px',
    fontSize: 'calc(13px * var(--font-scale))',
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
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    color: 'var(--text)',
    fontSize: 'calc(15px * var(--font-scale))',
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
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: 'calc(14px * var(--font-scale))',
  },
  tabsContainer: {
    display: 'flex',
    overflowX: 'auto',
    gap: '6px',
    paddingBottom: '4px',
    scrollbarWidth: 'none',
    boxSizing: 'border-box',
  },
  tabButton: {
    padding: '8px 14px',
    borderRadius: '10px',
    fontSize: 'calc(13px * var(--font-scale))',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  sortContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--surface-2)',
    padding: '10px 12px',
    borderRadius: '12px',
  },
  sortLabel: {
    fontSize: 'calc(12px * var(--font-scale))',
    color: 'var(--text-muted)',
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
    fontSize: 'calc(11px * var(--font-scale))',
    fontWeight: '700',
    cursor: 'pointer',
  },
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  orderCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
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
    fontSize: 'calc(16px * var(--font-scale))',
    fontWeight: '800',
    color: 'var(--text)',
  },
  statusBadge: {
    fontSize: 'calc(10px * var(--font-scale))',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '6px',
  },
  cardPrice: {
    fontSize: 'calc(15px * var(--font-scale))',
    fontWeight: '700',
    color: 'var(--text)',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  custName: {
    fontSize: 'calc(16px * var(--font-scale))',
    fontWeight: '700',
    margin: 0,
    color: 'var(--text)',
  },
  garmentsText: {
    fontSize: 'calc(13px * var(--font-scale))',
    color: 'var(--text-muted)',
    margin: 0,
    lineHeight: '1.4',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--border)',
    paddingTop: '10px',
  },
  deadline: {
    fontSize: 'calc(12px * var(--font-scale))',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  balanceDue: {
    fontSize: 'calc(12px * var(--font-scale))',
    color: 'var(--text-muted)',
  },
  loadMoreBtn: {
    width: '100%',
    padding: '12px',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    color: 'var(--text)',
    fontSize: 'calc(13px * var(--font-scale))',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
  emptyCard: {
    background: 'var(--surface-2)',
    border: '1px dashed var(--border)',
    borderRadius: '20px',
    padding: '48px 16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  emptyIcon: {
    fontSize: 'calc(36px * var(--font-scale))',
  },
  emptyText: {
    fontSize: 'calc(14px * var(--font-scale))',
    color: 'var(--text-muted)',
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
    fontSize: 'calc(14px * var(--font-scale))',
    color: 'var(--text-muted)',
  },
};
