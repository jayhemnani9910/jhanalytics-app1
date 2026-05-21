import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthGate } from './auth/AuthGate';
import { TabBar } from './components/TabBar';
import { ConnectionBadge } from './components/ConnectionBadge';
import { Dashboard } from './screens/Dashboard';
import { Customers } from './screens/Customers';
import { CustomerDetail } from './screens/CustomerDetail';
import { Orders } from './screens/Orders';
import { OrderEditor } from './screens/OrderEditor';
import { OrderDetail } from './screens/OrderDetail';
import { Settings } from './screens/Settings';
import { Templates } from './screens/Templates';

function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <div style={styles.appLayout}>
          <header style={styles.header}>
            <span style={styles.logoText}>Pareshbhai Tailor</span>
            <ConnectionBadge />
          </header>
          <main style={styles.main}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/new" element={<OrderEditor />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/templates" element={<Templates />} />
            </Routes>
          </main>
          <TabBar />
        </div>
      </AuthGate>
    </BrowserRouter>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appLayout: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'radial-gradient(circle at top right, #1f2937, #111827)',
    color: '#ffffff',
    fontFamily: '"Inter", "Noto Sans Gujarati", sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    background: 'rgba(17, 24, 39, 0.4)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    position: 'sticky',
    top: 0,
    zIndex: 900,
    boxSizing: 'border-box',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: '700',
    letterSpacing: '-0.3px',
    background: 'linear-gradient(135deg, #c084fc, #a855f7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
  },
};

export default App;
