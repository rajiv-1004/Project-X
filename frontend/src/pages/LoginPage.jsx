import React, { useState, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { exchangeCodeForSession } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';

/**
 * LoginPage — renders the Google Sign-In button and handles
 * the authorization-code flow.
 *
 * Flow:
 *  1. useGoogleLogin (flow: 'auth-code') triggers the GIS popup.
 *  2. GIS returns a one-time authorization code — NOT an access token.
 *  3. We POST the code to the backend, which exchanges it for tokens
 *     server-side and returns a session token.
 *  4. The session token is stored in AuthContext (in-memory only).
 */
function LoginPage() {
  const { login, setLoading } = useAuth();
  const [error, setError] = useState(null);
  const [signingIn, setSigningIn] = useState(false);

  const handleSuccess = useCallback(async ({ code }) => {
    setSigningIn(true);
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await exchangeCodeForSession(code);
      login(user, token);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[LoginPage] auth error:', err);
      setError('Sign-in failed. Please try again.');
    } finally {
      setSigningIn(false);
      setLoading(false);
    }
  }, [login, setLoading]);

  const handleError = useCallback(() => {
    setError('Google sign-in was cancelled or failed. Please try again.');
    setSigningIn(false);
  }, []);

  // Authorization-code flow — backend handles the token exchange
  const triggerLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: handleSuccess,
    onError: handleError,
    // Request only the minimum scopes needed for Drive and Sheets
    scope: [
      'openid',
      'profile',
      'email',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets',
    ].join(' '),
  });

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Project X</h1>
        <p className={styles.subtitle}>
          Upload photos, extract GPS coordinates, and sync everything to your Google Drive.
        </p>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button
          id="google-signin-btn"
          className={styles.loginBtn}
          onClick={() => { setSigningIn(true); triggerLogin(); }}
          disabled={signingIn}
          aria-busy={signingIn}
        >
          {signingIn ? 'Signing in…' : 'Sign in with Google'}
        </button>
      </div>
    </main>
  );
}

export default LoginPage;
