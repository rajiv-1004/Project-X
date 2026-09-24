import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchThumbnailBlob } from '../services/driveService';
import { formatCoordinates } from '../utils/exifUtils';
import styles from './PhotoCard.module.css';

/**
 * PhotoCard — renders one field record.
 * GPS coordinates are the primary data point, rendered in IBM Plex Mono
 * in signal green. Cards with GPS data get a 2px signal-green top border.
 * Thumbnail loads via authenticated blob proxy.
 */
function PhotoCard({ photo, onClick, onShare }) {
  const { token } = useAuth();
  const [imgSrc, setImgSrc] = useState(photo.thumbnailLink || null);

  useEffect(() => {
    let active = true;
    let blobUrl = null;

    if (photo.fileId && token) {
      fetchThumbnailBlob(photo.fileId, token)
        .then((url) => {
          if (active) {
            blobUrl = url;
            setImgSrc(url);
          }
        })
        .catch(() => {
          // Keep photo.thumbnailLink as fallback — no user-visible error for thumbnails
        });
    }

    return () => {
      active = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [photo.fileId, token]);

  const hasGPS = photo.lat != null && photo.lng != null;

  return (
    <article className={`${styles.card} ${hasGPS ? styles.cardGps : ''}`}>
      {/* Thumbnail */}
      <div className={styles.thumbContainer}>
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={photo.name}
            className={styles.thumb}
            loading="lazy"
            onClick={hasGPS ? onClick : undefined}
            style={{ cursor: hasGPS ? 'pointer' : 'default' }}
          />
        ) : (
          <div className={styles.thumbPlaceholder} aria-label="Photo loading">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}

        <div className={styles.overlayTop}>
          {hasGPS ? (
            <span className={styles.gpsBadge} title="GPS metadata present">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              GPS
            </span>
          ) : (
            <span className={styles.noGpsBadge}>no GPS</span>
          )}

          {photo.webViewLink && (
            <a
              href={photo.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.driveLinkBtn}
              title="Open in Google Drive"
              aria-label="Open original file in Google Drive"
              onClick={(e) => e.stopPropagation()}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <h3 className={styles.title} title={photo.name}>{photo.name}</h3>

        {/* GPS coordinates — the primary data, displayed in mono signal green */}
        {hasGPS ? (
          <span className={styles.coords} title={`Latitude: ${photo.lat}, Longitude: ${photo.lng}`}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {formatCoordinates(photo.lat, photo.lng)}
          </span>
        ) : (
          <span className={styles.coordsAbsent}>no location data</span>
        )}

        <div className={styles.actions}>
          <button
            id={`photo-card-${photo.fileId}`}
            className={styles.mapBtn}
            onClick={onClick}
            disabled={!hasGPS}
            title={hasGPS ? 'View location on map' : 'No GPS data to map'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
            <span>Map</span>
          </button>

          <button
            id={`share-btn-${photo.fileId}`}
            className={styles.shareBtn}
            onClick={() => onShare && onShare(photo)}
            title="Share with Google account"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <span>Share</span>
          </button>
        </div>
      </div>
    </article>
  );
}

export default PhotoCard;
