import React from 'react';
import styles from './StatsCards.module.css';

/**
 * StatsCards — 4 responsive metric summary cards:
 *  1. Photos Uploaded
 *  2. Drive Folder
 *  3. Google Sheet
 *  4. Locations Mapped
 */
function StatsCards({ photos = [], driveInfo = null, userName = '' }) {
  const totalPhotos = photos.length;
  const mappedCount = photos.filter((p) => p.lat != null && p.lng != null).length;
  const folderName = driveInfo?.folderName || (userName ? userName : 'Connected');
  const sheetName = 'GPS Log';

  return (
    <div className={styles.grid}>
      {/* 1. Photos Uploaded */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.title}>Photos Uploaded</span>
          <div className={`${styles.iconWrap} ${styles.blueIcon}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
        </div>
        <div className={styles.value}>{totalPhotos}</div>
        <span className={styles.badgeSuccess}>All synced</span>
      </div>

      {/* 2. Drive Folder */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.title}>Drive Folder</span>
          <div className={`${styles.iconWrap} ${styles.amberIcon}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
        </div>
        <div className={styles.valueText} title={folderName}>{folderName}</div>
        <span className={styles.badgeNeutral}>Google Drive</span>
      </div>

      {/* 3. Google Sheet */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.title}>Google Sheet</span>
          <div className={`${styles.iconWrap} ${styles.emeraldIcon}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="8" y1="13" x2="16" y2="13"></line>
              <line x1="8" y1="17" x2="16" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
        </div>
        <div className={styles.valueText} title={sheetName}>{sheetName}</div>
        <span className={styles.badgeSuccess}>Live Sync</span>
      </div>

      {/* 4. Locations Mapped */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.title}>Locations Mapped</span>
          <div className={`${styles.iconWrap} ${styles.purpleIcon}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        </div>
        <div className={styles.value}>{mappedCount}</div>
        <span className={styles.badgePurple}>{totalPhotos > 0 ? `${Math.round((mappedCount / totalPhotos) * 100)}% with GPS` : '0 with GPS'}</span>
      </div>
    </div>
  );
}

export default StatsCards;
