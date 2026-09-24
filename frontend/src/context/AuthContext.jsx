import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { setOnUnauthorized } from '../services/api';

/**
 * AuthContext stores the authenticated user profile and the access token
 * returned by the backend after the OAuth code exchange.
 *
 * Tokens are kept only in React state (in-memory) — never in localStorage
 * or cookies — so they disappear on page reload, requiring re-auth.
 * This keeps secrets out of persistent browser storage.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]                 = useState(null);   // { name, email, picture }
  const [token, setToken]               = useState(null);   // opaque session token for /api calls
  const [loading, setLoading]           = useState(false);
  const [sessionError, setSessionError] = useState(null);

  /**
   * Called after a successful OAuth code exchange on the backend.
   * @param {object} profile  - User profile from Google
   * @param {string} sessionToken - Backend-issued token (not the raw Google access token)
   */
  const login = useCallback((profile, sessionToken) => {
    setUser(profile);
    setToken(sessionToken);
    setSessionError(null);
  }, []);

  const logout = useCallback((reason = null) => {
    setUser(null);
    setToken(null);
    setSessionError(reason);
  }, []);

  // Listen for 401 Unauthorized from any API request mid-session
  useEffect(() => {
    setOnUnauthorized(() => {
      logout('Your session has expired. Please sign in again.');
    });
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        setLoading,
        sessionError,
        setSessionError,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Convenience hook — throws if used outside AuthProvider */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
