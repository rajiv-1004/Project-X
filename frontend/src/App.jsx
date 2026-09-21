import React from 'react';
import { useAuth } from './context/AuthContext';

// Lazy-load heavy views at module level — defining them inside the render
// function would cause React to recreate the lazy component on every render,
// which triggers a remount loop and a blank screen.
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

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

  return (
    <React.Suspense
      fallback={
        <div className="app-loading">
          <div className="spinner" />
        </div>
      }
    >
      {user ? <Dashboard /> : <LoginPage />}
    </React.Suspense>
  );
}

export default App;
