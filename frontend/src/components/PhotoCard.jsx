import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { sharePhoto } from '../services/driveService';
import { formatCoordinates } from '../utils/exifUtils';
import styles from './PhotoCard.module.css';

/**
 * PhotoCard — thumbnail + GPS coordinates + share button.
 * Clicking the card body opens the map view (via onPhotoClick).
 * The share icon opens a small inline form to enter a target email.
 */
function PhotoCard({ photo, onClick }) {
  const { token } = useAuth();
  const [sharing, setSharing]     = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareState, setShareState] = useState('idle'); // 'idle' | 'open' | 'loading' | 'done' | 'error'
  const [shareError, setShareError] = useState(null);

  const handleShare = async (e) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;
    setShareState('loading');
    setShareError(null);
    try {
      await sharePhoto(photo.fileId, shareEmail.trim(), token);
      setShareState('done');
      setShareEmail('');
    } catch (err) {
      if (import.meta.env.DEV) console.error('[PhotoCard] share error:', err);
      setShareError('Sharing failed. Please check the email address and try again.');
      setShareState('error');
    }
  };

  const hasGPS = photo.lat != null && photo.lng != null;

  return (
    <article className={styles.card}>
      {/* Thumbnail — clicking opens map view */}
      <button
        id={`photo-card-${photo.fileId}`}
        className={styles.thumbBtn}
        onClick={onClick}
        aria-label={`View map for ${photo.name}`}
        disabled={!hasGPS}
        title={hasGPS ? 'Click to view on map' : 'No GPS data for this photo'}
      >
        <img
          src={photo.thumbnailLink}
          alt={photo.name}
          className={styles.thumb}
          loading="lazy"
        />
        {!hasGPS && <span className={styles.noGpsBadge}>No GPS</span>}
      </button>

      <div className={styles.meta}>
        <p className={styles.name} title={photo.name}>{photo.name}</p>
        {hasGPS && (
          <p className={styles.coords}>
            {formatCoordinates(photo.lat, photo.lng)}
          </p>
        )}

        {/* Share section */}
        {shareState === 'idle' && (
          <button
            id={`share-btn-${photo.fileId}`}
            className={styles.shareBtn}
            onClick={() => setShareState('open')}
            aria-label={`Share ${photo.name}`}
          >
            Share
          </button>
        )}

        {shareState === 'open' && (
          <form className={styles.shareForm} onSubmit={handleShare}>
            <input
              id={`share-email-${photo.fileId}`}
              type="email"
              className={styles.shareInput}
              placeholder="Google account email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              required
              autoFocus
            />
            <div className={styles.shareActions}>
              <button type="submit" className={styles.shareSendBtn}>Share</button>
              <button
                type="button"
                className={styles.shareCancelBtn}
                onClick={() => { setShareState('idle'); setShareEmail(''); }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {shareState === 'loading' && (
          <p className={styles.shareStatus}>Sharing…</p>
        )}

        {shareState === 'done' && (
          <p className={styles.shareSuccess} role="status">Shared successfully!</p>
        )}

        {shareState === 'error' && (
          <>
            <p className={styles.shareError} role="alert">{shareError}</p>
            <button className={styles.shareBtn} onClick={() => setShareState('open')}>
              Try again
            </button>
          </>
        )}
      </div>
    </article>
  );
}

export default PhotoCard;
