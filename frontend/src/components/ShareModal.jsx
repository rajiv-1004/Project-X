import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sharePhoto, fetchThumbnailBlob } from '../services/driveService';
import styles from './ShareModal.module.css';

/**
 * ShareModal — Dialog for sharing photos with Google accounts via Drive permissions.
 * Matches Panel 5 of the reference design image.
 */
function ShareModal({ photo, onClose }) {
  const { token } = useAuth();
  const [email, setEmail]       = useState('su1@vr2.in');
  const [role, setRole]         = useState('writer'); // 'reader' | 'writer'
  const [notify, setNotify]     = useState(false);
  const [sharing, setSharing]   = useState(false);
  const [success, setSuccess]   = useState(null);
  const [error, setError]       = useState(null);
  const [imgSrc, setImgSrc]     = useState(photo?.thumbnailLink || null);

  useEffect(() => {
    let active = true;
    let blobUrl = null;

    if (photo?.fileId && token) {
      fetchThumbnailBlob(photo.fileId, token)
        .then((url) => {
          if (active) {
            blobUrl = url;
            setImgSrc(url);
          }
        })
        .catch(() => {});
    }

    return () => {
      active = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [photo?.fileId, token]);

  if (!photo) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSharing(true);
    setError(null);
    setSuccess(null);

    try {
      await sharePhoto(photo.fileId, email.trim(), token, role, notify);
      setSuccess(`Photo shared successfully with ${email.trim()}!`);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[ShareModal] share error:', err);
      setError('Sharing failed. Please check the email address and try again.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="share-title">
        {/* Header */}
        <div className={styles.header}>
          <h2 id="share-title" className={styles.title}>Share Photo</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        {/* Photo Preview Summary */}
        <div className={styles.photoSummary}>
          <div className={styles.thumbWrapper}>
            {imgSrc ? (
              <img src={imgSrc} alt={photo.name} className={styles.thumb} />
            ) : (
              <div className={styles.thumbFallback}>📷</div>
            )}
          </div>
          <div className={styles.photoInfo}>
            <span className={styles.photoName} title={photo.name}>{photo.name}</span>
            <span className={styles.photoMeta}>Google Drive Photo</span>
          </div>
        </div>

        {/* Share Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <label htmlFor="share-email" className={styles.inputLabel}>
            Share with Google account
          </label>
          <div className={styles.inputRow}>
            <input
              id="share-email"
              type="email"
              className={styles.emailInput}
              placeholder="e.g. su1@vr2.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={sharing}
            />
            <select
              className={styles.roleSelect}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={sharing}
              aria-label="Permission role"
            >
              <option value="writer">Editor</option>
              <option value="reader">Viewer</option>
            </select>
          </div>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              disabled={sharing}
            />
            <span>Notify people</span>
          </label>

          {/* Feedback Banners */}
          {success && (
            <div className={styles.successBanner} role="status">
              <svg className={styles.bannerIcon} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className={styles.errorBanner} role="alert">
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={sharing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={sharing || !email.trim()}
            >
              {sharing ? 'Sharing…' : 'Share'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ShareModal;
