import React, { useState, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { exchangeCodeForSession } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';

/**
 * LoginPage — split-panel identity layout.
 * Left: dark ink panel with brand name in IBM Plex Mono and context line.
 * Right: paper-toned panel with Google sign-in and capability list.
 * Preserves the authorization-code flow and backend exchange unchanged.
 */
function LoginPage() {
  const { login, setLoading, sessionError, setSessionError } = useAuth();
  const [error, setError] = useState(null);
  const [signingIn, setSigningIn] = useState(false);

  const activeError = error || sessionError;

  const handleSuccess = useCallback(async ({ code }) => {
    setSigningIn(true);
    setError(null);
    if (setSessionError) setSessionError(null);
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
      {/* Left panel — dark brand identity */}
      <div className={styles.leftPanel} aria-hidden="false">
        <div className={styles.brand}>
          {/* Location pin icon — reflects the tool's core function */}
          <svg className={styles.brandIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className={styles.brandName}>Project X</span>
        </div>

        <div className={styles.tagline}>
          <span className={styles.separator} />
          <p className={styles.taglineText}>
            Field photo logging for professionals. Capture, geo-tag, and organise documents in Google Drive.
          </p>
        </div>

        <span className={styles.leftFooter}>Drive &amp; GPS Suite</span>
      </div>

      {/* Right panel — sign-in form */}
      <div className={styles.rightPanel}>
        <div className={styles.formCard}>
          <div>
            <h1 className={styles.heading}>Sign in to continue</h1>
            <p className={styles.subheading}>
              Your photos and GPS records are stored privately in your own Google Drive.
            </p>
          </div>

          {activeError && (
            <div className={styles.errorBanner} role="alert">
              {activeError}
            </div>
          )}

          <button
            id="google-signin-btn"
            className={styles.googleBtn}
            onClick={() => {
              setError(null);
              if (setSessionError) setSessionError(null);
              setSigningIn(true);
              triggerLogin();
            }}
            disabled={signingIn}
            aria-busy={signingIn}
          >
            {signingIn ? (
              <div className={styles.btnSpinner} aria-hidden="true" />
            ) : (
              <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
            )}
            <span>
              {signingIn ? 'Signing in…' : 'Sign in with Google'}
            </span>
          </button>

          <p className={styles.privacyNote}>
            Secure OAuth 2.0 via Google. No passwords stored. No public file access.
          </p>

          <ul className={styles.capList} aria-label="What this tool does">
            <li className={styles.capItem}><span className={styles.capDot} />Upload photos and documents from your device or camera</li>
            <li className={styles.capItem}><span className={styles.capDot} />Extract GPS coordinates from photo EXIF metadata</li>
            <li className={styles.capItem}><span className={styles.capDot} />Store files privately in your Google Drive folder</li>
            <li className={styles.capItem}><span className={styles.capDot} />Log location data automatically to a Google Sheet</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
