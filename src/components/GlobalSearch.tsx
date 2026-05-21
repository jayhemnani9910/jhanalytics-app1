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
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '0 16px',
    height: '48px',
    boxSizing: 'border-box',
    boxShadow: 'none',
  },
  searchIcon: {
    fontSize: 'calc(18px * var(--font-scale))',
    marginRight: '12px',
    color: 'var(--text-muted)',
  },
  input: {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    color: 'var(--text)',
    fontSize: 'calc(15px * var(--font-scale))',
    fontFamily: 'inherit',
    width: '100%',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 'calc(14px * var(--font-scale))',
    cursor: 'pointer',
    padding: '4px',
  },
  dropdown: {
    position: 'absolute',
    top: '56px',
    left: 0,
    right: 0,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    boxShadow: 'none',
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
    color: 'var(--text-muted)',
    fontSize: 'calc(14px * var(--font-scale))',
  },
  sectionHeader: {
    fontSize: 'calc(11px * var(--font-scale))',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '4px 8px 8px 8px',
    borderBottom: '1px solid var(--border)',
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
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'calc(13px * var(--font-scale))',
    fontWeight: '700',
    color: '#ffffff',
    flexShrink: 0,
  },
  tokenBadge: {
    width: '56px',
    height: '36px',
    borderRadius: '10px',
    background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
    border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
    color: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'calc(13px * var(--font-scale))',
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
    fontSize: 'calc(14px * var(--font-scale))',
    fontWeight: '600',
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  subtext: {
    fontSize: 'calc(12px * var(--font-scale))',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};
