import React from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './SettingsView.module.css';

/**
 * SettingsView — user profile and Google integration diagnostics:
 *  - Google Profile info (name, email, picture, status).
 *  - Drive folder details & direct link.
 *  - Google Sheet details & direct link.
 *  - Architectural security specs summary.
 *  - Sign out action.
 */
function SettingsView({ driveInfo }) {
  const { user, logout } = useAuth();

  const folderName = driveInfo?.folderName || (user?.name ? user.name : 'Connected');
  const folderId = driveInfo?.folderId || 'Synced';
  const sheetId = driveInfo?.sheetId || 'Synced';
  const folderUrl = driveInfo?.folderUrl || 'https://drive.google.com';
  const sheetUrl = driveInfo?.sheetUrl || (driveInfo?.sheetId ? `https://docs.google.com/spreadsheets/d/${driveInfo.sheetId}` : 'https://docs.google.com');

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>Settings & Integrations</h1>
        <p className={styles.pageSubtitle}>
          Manage your account profile, Google Drive connections, and security settings.
        </p>
      </div>

      <div className={styles.sectionsGrid}>
        {/* User Profile Card */}
        <section className={styles.card}>
          <h2 className={styles.cardHeading}>Google Account Profile</h2>
          <div className={styles.profileRow}>
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarFallback}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>{user?.name || 'Authorized User'}</span>
              <span className={styles.profileEmail}>{user?.email || '—'}</span>
              <div className={styles.statusPill}>
                <span className={styles.statusDot} />
                <span>OAuth 2.0 Connected</span>
              </div>
            </div>
          </div>
        </section>

        {/* Google Drive Card */}
        <section className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.cardTitleWrap}>
              <div className={`${styles.iconCircle} ${styles.blueIcon}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <h2 className={styles.cardHeading}>Google Drive Folder</h2>
            </div>
            <a
              href={folderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.linkAction}
            >
              <span>Open in Drive</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>

          <div className={styles.detailsList}>
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>Folder Name</span>
              <span className={styles.detailVal}>{folderName}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>Folder ID</span>
              <span className={styles.detailValMono}>{folderId}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>Duplicate Prevention</span>
              <span className={styles.detailVal}>Active (Exact name match)</span>
            </div>
          </div>
        </section>

        {/* Google Sheets Card */}
        <section className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.cardTitleWrap}>
              <div className={`${styles.iconCircle} ${styles.greenIcon}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <h2 className={styles.cardHeading}>Google Sheets GPS Log</h2>
            </div>
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.linkAction}
            >
              <span>Open in Sheets</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>

          <div className={styles.detailsList}>
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>Spreadsheet Name</span>
              <span className={styles.detailVal}>GPS Log</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>Spreadsheet ID</span>
              <span className={styles.detailValMono}>{sheetId}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>Logging Mode</span>
              <span className={styles.detailVal}>Real-time GPS EXIF sync</span>
            </div>
          </div>
        </section>

        {/* Security & Architecture Specs */}
        <section className={styles.card}>
          <div className={styles.cardTitleWrap}>
            <div className={`${styles.iconCircle} ${styles.purpleIcon}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <h2 className={styles.cardHeading}>Security & Privacy Standards</h2>
          </div>

          <div className={styles.specsList}>
            <div className={styles.specItem}>
              <strong>No Hardcoding:</strong> No user IDs, folder keys, or tokens committed.
            </div>
            <div className={styles.specItem}>
              <strong>Client-side EXIF:</strong> GPS coordinates extracted in browser via exifr.
            </div>
            <div className={styles.specItem}>
              <strong>User-level Sharing:</strong> Drive permissions granted directly per account.
            </div>
            <div className={styles.specItem}>
              <strong>No Disk Footprint:</strong> Multer memory storage and streaming uploads.
            </div>
          </div>
        </section>
      </div>

      {/* Danger / Session Zone */}
      <div className={styles.sessionCard}>
        <div>
          <h3 className={styles.sessionTitle}>Sign out of Project X</h3>
          <p className={styles.sessionDesc}>
            Clears your active in-memory session token. You can log back in anytime with your Google account.
          </p>
        </div>
        <button id="settings-logout-btn" className={styles.logoutBtn} onClick={logout}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default SettingsView;
