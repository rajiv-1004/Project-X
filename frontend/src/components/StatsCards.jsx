import React from 'react';
import styles from './StatsCards.module.css';

/**
 * StatsCards — Compact 4-metric geospatial summary:
 *  1. Photos Uploaded (total count & sync status)
 *  2. GPS Tagged (count & percentage)
 *  3. No GPS (attention count)
 *  4. Drive & Sheet Sync (live integration status)
 */
function StatsCards({ photos = [], driveInfo = null, userName = '' }) {
  const totalPhotos = photos.length;
  const mappedCount = photos.filter((p) => p.lat != null && p.lng != null).length;
  const noGpsCount = totalPhotos - mappedCount;
  const folderName = driveInfo?.folderName || (userName ? userName : 'Connected');

  const gpsPercentage = totalPhotos > 0 ? Math.round((mappedCount / totalPhotos) * 100) : 0;

  return (
    <div className={styles.metricsRow} aria-label="Geospatial summary metrics">
      {/* 1. Total Photos */}
      <div className={styles.metricCard}>
        <div className={styles.cardHeader}>
          <span className={styles.metricTitle}>Photos Stored</span>
          <div className={styles.metricIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        </div>
        <div className={styles.metricValueRow}>
          <span className={styles.metricValue}>{totalPhotos}</span>
          <span className={styles.badgeNeutral}>Drive Synced</span>
        </div>
      </div>

      {/* 2. GPS Tagged */}
      <div className={styles.metricCard}>
        <div className={styles.cardHeader}>
          <span className={styles.metricTitle}>GPS Tagged</span>
          <div className={styles.metricIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
        </div>
        <div className={styles.metricValueRow}>
          <span className={styles.metricValue}>{mappedCount}</span>
          <span className={styles.badgeSuccess}>
            {totalPhotos > 0 ? `${gpsPercentage}% Mapped` : '0 Mapped'}
          </span>
        </div>
      </div>

      {/* 3. No GPS */}
      <div className={styles.metricCard}>
        <div className={styles.cardHeader}>
          <span className={styles.metricTitle}>No Location</span>
          <div className={styles.metricIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
        </div>
        <div className={styles.metricValueRow}>
          <span className={styles.metricValue}>{noGpsCount}</span>
          {noGpsCount > 0 ? (
            <span className={styles.badgeWarning}>{noGpsCount} Untagged</span>
          ) : (
            <span className={styles.badgeSuccess}>All Geotagged</span>
          )}
        </div>
      </div>

      {/* 4. Drive & Sheet Sync */}
      <div className={styles.metricCard}>
        <div className={styles.cardHeader}>
          <span className={styles.metricTitle}>Drive Folder</span>
          <div className={styles.metricIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
        </div>
        <div className={styles.metricValueRow}>
          <span className={styles.metricValueText} title={folderName}>
            {folderName}
          </span>
          <span className={styles.badgeSuccess}>Live Sync</span>
        </div>
      </div>
    </div>
  );
}

export default StatsCards;
