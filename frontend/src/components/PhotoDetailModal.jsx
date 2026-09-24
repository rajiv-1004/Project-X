import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchThumbnailBlob } from '../services/driveService';
import { formatCoordinates } from '../utils/exifUtils';
import { extractPhotoTimestamp } from '../utils/fileUtils';
import styles from './PhotoDetailModal.module.css';

/**
 * PhotoDetailModal — Comprehensive geospatial photo detail inspection dialog.
 * Displays:
 *  - High-res authenticated image preview
 *  - Filename & metadata
 *  - GPS status with exact formatted coordinates
 *  - Timestamp & Google Drive link
 *  - Direct actions: View on Map, Open in Drive, Share with collaborator
 */
function PhotoDetailModal({ photo, onClose, onOpenMap, onShare }) {
  const { token } = useAuth();
  const [imgSrc, setImgSrc] = useState(photo?.thumbnailLink || null);
  const [loadingImg, setLoadingImg] = useState(true);

  useEffect(() => {
    let active = true;
    let blobUrl = null;

    if (photo?.fileId && token) {
      setLoadingImg(true);
      fetchThumbnailBlob(photo.fileId, token)
        .then((url) => {
          if (active) {
            blobUrl = url;
            setImgSrc(url);
            setLoadingImg(false);
          }
        })
        .catch(() => {
          if (active) setLoadingImg(false);
        });
    } else {
      setLoadingImg(false);
    }

    return () => {
      active = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [photo?.fileId, token]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!photo) return null;

  const hasGPS = photo.lat != null && photo.lng != null;
  const timestampDate = extractPhotoTimestamp(photo);
  const formattedTime = timestampDate
    ? timestampDate.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Recorded on upload';

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-detail-title"
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <span>Photo Record</span>
            {hasGPS ? (
              <span className={styles.badgeGps}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                GPS Logged
              </span>
            ) : (
              <span className={styles.badgeNoGps}>No GPS Data</span>
            )}
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Left: Image Canvas */}
          <div className={styles.imageColumn}>
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={photo.name}
                className={styles.mainImage}
              />
            ) : (
              <div className={styles.placeholder}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>{loadingImg ? 'Loading high-res preview…' : 'Preview unavailable'}</span>
              </div>
            )}
          </div>

          {/* Right: Technical Metadata & Actions */}
          <div className={styles.detailsColumn}>
            <div>
              <h2 id="photo-detail-title" className={styles.fileNameTitle}>
                {photo.name}
              </h2>
            </div>

            <div className={styles.metaGroup}>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>GPS Coordinates</span>
                {hasGPS ? (
                  <span className={styles.metaCoord}>
                    {formatCoordinates(photo.lat, photo.lng)}
                  </span>
                ) : (
                  <span className={styles.noCoordNotice}>
                    No location data available in photo EXIF
                  </span>
                )}
              </div>

              {hasGPS && (
                <>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Latitude</span>
                    <span className={styles.metaCoord}>{Number(photo.lat).toFixed(6)}°</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Longitude</span>
                    <span className={styles.metaCoord}>{Number(photo.lng).toFixed(6)}°</span>
                  </div>
                </>
              )}

              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Date Recorded / Uploaded</span>
                <span className={styles.metaValue}>{formattedTime}</span>
              </div>

              {photo.webViewLink && (
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Google Drive File</span>
                  <a
                    href={photo.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.externalLink}
                  >
                    <span>Open in Drive</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className={styles.actions}>
              {hasGPS && (
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => {
                    onClose();
                    if (onOpenMap) onOpenMap(photo);
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                    <line x1="8" y1="2" x2="8" y2="18" />
                    <line x1="16" y1="6" x2="16" y2="22" />
                  </svg>
                  <span>View on Map</span>
                </button>
              )}

              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => {
                  onClose();
                  if (onShare) onShare(photo);
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span>Share</span>
              </button>

              {photo.webViewLink && (
                <a
                  href={photo.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.btnSecondary}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>Drive</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PhotoDetailModal;
