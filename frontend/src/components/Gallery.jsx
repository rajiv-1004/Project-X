import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { listPhotos } from '../services/driveService';
import PhotoCard from './PhotoCard';
import ShareModal from './ShareModal';
import UploadButton from './UploadButton';
import styles from './Gallery.module.css';

/**
 * Gallery — fetches and renders the user's photos in a modern 3-column grid:
 *  - Real data from Google Drive + Sheets GPS metadata.
 *  - Header with title, subtitle, and compact '+ Upload Photo' trigger.
 *  - ShareModal integration when sharing a photo with su1@vr2.in or any Google account.
 *  - Empty, loading, and error states.
 */
function Gallery({ onPhotoClick, refreshTrigger, onUploaded }) {
  const { token } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sharingPhoto, setSharingPhoto] = useState(null);

  const fetchPhotos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listPhotos(token);
      setPhotos(data ?? []);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Gallery] fetch error:', err);
      setError("We couldn't load your photos. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos, refreshTrigger]);

  const handleUploadSuccess = (result) => {
    fetchPhotos();
    if (onUploaded) onUploaded(result);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer} aria-live="polite">
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Loading your photos from Google Drive…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <p className={styles.errorMessage} role="alert">{error}</p>
        <button className={styles.retryBtn} onClick={fetchPhotos}>Try Again</button>
      </div>
    );
  }

  return (
    <div className={styles.galleryPage}>
      {/* Header bar */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>My Photos</h1>
          <p className={styles.pageSubtitle}>
            Manage your uploaded documents, photos, and extracted GPS metadata.
          </p>
        </div>

        <div className={styles.headerActions}>
          <UploadButton variant="compact" onUploaded={handleUploadSuccess} />
        </div>
      </div>

      {photos.length === 0 ? (
        <div className={styles.emptyCard}>
          <div className={styles.emptyIconCircle}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
          <h3 className={styles.emptyTitle}>No photos uploaded yet</h3>
          <p className={styles.emptyDesc}>
            Upload a document or take a picture with your camera to extract GPS coordinates and sync with Google Drive.
          </p>
          <UploadButton variant="compact" onUploaded={handleUploadSuccess} />
        </div>
      ) : (
        <>
          <div className={styles.countBadge}>
            Showing {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
          </div>

          <section className={styles.grid} aria-label="Photo gallery">
            {photos.map((photo) => (
              <PhotoCard
                key={photo.fileId}
                photo={photo}
                onClick={() => onPhotoClick(photo)}
                onShare={(p) => setSharingPhoto(p)}
              />
            ))}
          </section>
        </>
      )}

      {/* Share Modal */}
      {sharingPhoto && (
        <ShareModal
          photo={sharingPhoto}
          onClose={() => setSharingPhoto(null)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}

export default Gallery;
