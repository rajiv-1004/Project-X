import React from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';

/**
 * App shell — renders login screen or the main dashboard
 * depending on authentication state.
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

  return user ? <Dashboard /> : <LoginPage />;
}

export default App;
