import React from 'react';
import { useAuth } from './context/AuthContext';

/**
 * App shell — renders login screen or the main dashboard
 * depending on authentication state.
 *
 * Routing between Gallery and Map views is handled inside Dashboard
 * using simple React state (no router library needed for two views).
 */
function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading" aria-live="polite" aria-label="Loading">
        <div className="spinner" />
        <p>Loading…</p>
      </div>
    );
  }

  // Lazy-load heavy views to keep the initial bundle small
  const LoginPage = React.lazy(() => import('./pages/LoginPage'));
  const Dashboard = React.lazy(() => import('./pages/Dashboard'));

  return (
    <React.Suspense fallback={<div className="app-loading"><div className="spinner" /></div>}>
      {user ? <Dashboard /> : <LoginPage />}
    </React.Suspense>
  );
}

export default App;
