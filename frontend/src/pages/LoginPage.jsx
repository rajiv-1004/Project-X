import React, { useState, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { exchangeCodeForSession } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';

/**
 * LoginPage — renders the modern landing page matching Panel 1 of the reference design.
 * Preserves the exact authorization-code flow and backend exchange.
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

  // Authorization-code flow — backend handles token exchange
  const triggerLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: handleSuccess,
    onError: handleError,
    scope: [
      'openid',
      'profile',
      'email',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets',
    ].join(' '),
  });

  return (
    <div className={styles.wrapper}>
      {/* Dark gradient backdrop with mountain image */}
      <div className={styles.overlay} />

      {/* Top Navbar */}
      <header className={styles.navHeader}>
        <div className={styles.brand}>
          <svg className={styles.brandIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
          <span className={styles.brandText}>Project X</span>
        </div>
      </header>

      {/* Hero Content */}
      <main className={styles.heroContent}>
        <h1 className={styles.heroHeading}>Capture. Track. Store.</h1>
        <p className={styles.heroSubtitle}>
          Upload photos, extract location, and keep everything organized in your Google Drive.
        </p>

        {error && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}

        <div className={styles.ctaWrapper}>
          <button
            id="google-signin-btn"
            className={styles.googleBtn}
            onClick={() => { setSigningIn(true); triggerLogin(); }}
            disabled={signingIn}
            aria-busy={signingIn}
          >
            {signingIn ? (
              <div className={styles.btnSpinner} />
            ) : (
              <svg className={styles.googleIcon} viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
            <span className={styles.googleBtnText}>
              {signingIn ? 'Signing in with Google…' : 'Sign in with Google'}
            </span>
          </button>
          <span className={styles.securityBadge}>Secure. Private. Powered by Google.</span>
        </div>

        {/* Feature Indicator Cards */}
        <div id="features" className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <span className={styles.featureTitle}>Drive Storage</span>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className={styles.featureTitle}>GPS Metadata</span>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className={styles.featureTitle}>Sheets Logging</span>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className={styles.featureTitle}>Map View</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>Project X — Built for a smarter tomorrow.</p>
      </footer>
    </div>
  );
}

export default LoginPage;
