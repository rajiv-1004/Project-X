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

  const activeError = typeof error === 'string' ? error : (typeof sessionError === 'string' ? sessionError : null);

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

        {/* Topographic contour pattern — 4 unevenly spaced elevation rings */}
        <div className={styles.contourContainer} aria-hidden="true" role="presentation">
          <svg
            className={styles.contourSvg}
            viewBox="0 0 500 320"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            focusable="false"
            aria-hidden="true"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Outer base contour — broad perimeter boundary */}
            <path
              d="M -30,130 C 30,50 130,40 230,80 C 340,120 400,60 480,95 C 530,120 540,180 500,230 C 450,290 330,270 230,290 C 120,310 10,260 -30,200 Z"
              stroke="var(--signal-mid)"
              strokeWidth="1.4"
            />
            {/* Intermediate lower contour — begins steep pinch on northwest flank */}
            <path
              d="M 15,138 C 65,70 145,62 235,96 C 325,130 380,82 445,115 C 485,138 492,185 458,228 C 410,275 305,250 225,264 C 145,278 45,238 15,138 Z"
              stroke="var(--signal-mid)"
              strokeWidth="1.4"
            />
            {/* Mid-elevation contour — closely compressed against crest ring on the north */}
            <path
              d="M 60,142 C 95,85 160,78 240,110 C 310,138 360,105 410,130 C 445,152 448,192 415,225 C 375,255 280,230 215,240 C 145,250 80,215 60,142 Z"
              stroke="var(--signal-mid)"
              strokeWidth="1.4"
            />
            {/* Summit ridge contour — high-elevation plateau with wide offset south shelf */}
            <path
              d="M 115,148 C 138,102 185,95 248,122 C 295,142 332,125 365,145 C 390,162 392,192 365,212 C 330,230 255,212 205,218 C 150,224 125,190 115,148 Z"
              stroke="var(--signal-mid)"
              strokeWidth="1.4"
            />
          </svg>
        </div>

        <div className={styles.tagline}>
          <span className={styles.separator} />
          <h2 className={styles.taglineHeading}>Capture. Locate. Organise.</h2>
          <p className={styles.taglineText}>
            Field documentation &amp; geospatial photo logging. Capture records, extract GPS metadata, and sync directly with Google Drive.
          </p>
        </div>

        <span className={styles.leftFooter}>Geospatial Field Suite</span>
      </div>

      {/* Right panel — sign-in form */}
      <div className={styles.rightPanel}>
        <div className={styles.formCard}>
          <div>
            <h1 className={styles.heading}>Sign in to Project X</h1>
            <p className={styles.subheading}>
              Capture field photos, extract location data, and keep everything organised in your private Google Drive.
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
