import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { matchesQuery } from '../domain/search';

export function GlobalSearch() {
  const t = useT();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const customers = useStore((s) => s.customers);
  const orders = useStore((s) => s.orders);

  // Close search results dropdown on clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimmedQuery = query.trim();
  const showResults = isOpen && trimmedQuery.length > 0;

  let matchedCustomers: typeof customers = [];
  let matchedOrders: typeof orders = [];

  if (trimmedQuery.length > 0) {
    // 1. Search Customers
    matchedCustomers = customers
      .filter((c) =>
        matchesQuery({ name: c.name, phone: c.phone || '', token: '' }, trimmedQuery)
      )
      .slice(0, 5); // limit to 5

    // 2. Search Orders
    matchedOrders = orders
      .filter((o) => {
        const cust = customers.find((c) => c.id === o.customerId);
        return matchesQuery(
          {
            name: cust ? cust.name : '',
            phone: cust?.phone || '',
            token: o.tokenNo,
          },
          trimmedQuery
        );
      })
      .slice(0, 5); // limit to 5
  }

  const handleResultClick = (path: string) => {
    navigate(path);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={styles.container}>
      <div style={styles.inputWrapper}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={t('customers.searchPlaceholder') || 'Search name, phone, token...'}
          style={styles.input}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            style={styles.clearBtn}
          >
            ✕
          </button>
        )}
      </div>

      {showResults && (
        <div style={styles.dropdown}>
          {matchedCustomers.length === 0 && matchedOrders.length === 0 ? (
            <div style={styles.emptyText}>No matches found.</div>
          ) : (
            <div style={styles.resultsScroll}>
              {/* Customers section */}
              {matchedCustomers.length > 0 && (
                <div>
                  <div style={styles.sectionHeader}>{t('nav.customers') || 'Customers'}</div>
                  {matchedCustomers.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleResultClick(`/customers/${c.id}`)}
                      onMouseEnter={() => setHoveredId(c.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        ...styles.resultItem,
                        ...(hoveredId === c.id ? { background: 'rgba(255, 255, 255, 0.08)' } : {})
                      }}
                    >
                      <div style={styles.avatar}>
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={styles.meta}>
                        <div style={styles.name}>{c.name}</div>
                        {c.phone && <div style={styles.subtext}>📞 {c.phone}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Orders section */}
              {matchedOrders.length > 0 && (
                <div style={matchedCustomers.length > 0 ? { marginTop: '12px' } : {}} >
                  <div style={styles.sectionHeader}>{t('nav.orders') || 'Orders'}</div>
                  {matchedOrders.map((o) => {
                    const cust = customers.find((c) => c.id === o.customerId);
                    return (
                      <div
                        key={o.id}
                        onClick={() => handleResultClick(`/orders/${o.id}`)}
                        onMouseEnter={() => setHoveredId(o.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        style={{
                          ...styles.resultItem,
                          ...(hoveredId === o.id ? { background: 'rgba(255, 255, 255, 0.08)' } : {})
                        }}
                      >
                        <div style={styles.tokenBadge}>
                          #{o.tokenNo}
                        </div>
                        <div style={styles.meta}>
                          <div style={styles.name}>{cust ? cust.name : 'Unknown'}</div>
                          <div style={styles.subtext}>
                            {o.items.length} garments • Deadline: {o.deadline}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    boxSizing: 'border-box',
    zIndex: 100,
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '0 16px',
    height: '48px',
    boxSizing: 'border-box',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  searchIcon: {
    fontSize: '18px',
    marginRight: '12px',
    color: '#9ca3af',
  },
  input: {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    color: '#ffffff',
    fontSize: '15px',
    fontFamily: 'inherit',
    width: '100%',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '4px',
  },
  dropdown: {
    position: 'absolute',
    top: '56px',
    left: 0,
    right: 0,
    background: '#1f2937',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
    padding: '12px',
    maxHeight: '380px',
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  resultsScroll: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  emptyText: {
    padding: '16px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '14px',
  },
  sectionHeader: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '4px 8px 8px 8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    gap: '12px',
    marginTop: '4px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.03)',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '700',
    color: '#ffffff',
    flexShrink: 0,
  },
  tokenBadge: {
    width: '56px',
    height: '36px',
    borderRadius: '10px',
    background: 'rgba(59, 130, 246, 0.15)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    color: '#60a5fa',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '700',
    flexShrink: 0,
  },
  meta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  subtext: {
    fontSize: '12px',
    color: '#9ca3af',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};
