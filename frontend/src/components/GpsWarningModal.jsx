import React, { useEffect, useRef } from 'react';
import { formatFileSize } from '../utils/fileUtils';
import styles from './GpsWarningModal.module.css';

/**
 * GpsWarningModal — accessible confirmation dialog displayed when an uploaded photo
 * contains no GPS EXIF metadata.
 *
 * Provides two clear choices:
 *  - "Cancel": Aborts the upload, making zero network calls.
 *  - "Upload anyway": Proceeds with upload (logging null GPS coordinates).
 *
 * Accessibility features:
 *  - Proper ARIA attributes (role="dialog", aria-modal="true", labelledby/describedby)
 *  - Closes on Escape key press (unless upload is currently in flight)
 *  - Traps keyboard focus within the dialog
 *  - Auto-focuses the safe default button (Cancel) on mount
 *  - Full disabled & loading state during upload
 */
function GpsWarningModal({ file, uploading, onConfirm, onCancel }) {
  const modalRef = useRef(null);
  const cancelBtnRef = useRef(null);

  // Auto-focus safe default (Cancel) on open
  useEffect(() => {
    cancelBtnRef.current?.focus();
  }, []);

  // Handle Escape key & trap Tab key focus
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (!uploading) {
          e.preventDefault();
          onCancel();
        }
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button:not([disabled]), [tabindex="0"]'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uploading, onCancel]);

  if (!file) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={() => {
        if (!uploading) onCancel();
      }}
    >
      <div
        ref={modalRef}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gps-modal-title"
        aria-describedby="gps-modal-desc"
      >
        {/* Header with warning icon and title */}
        <div className={styles.header}>
          <div className={styles.headerTitleWrap}>
            <div className={styles.warningIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <h2 id="gps-modal-title" className={styles.title}>
              No Location Data Found
            </h2>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onCancel}
            disabled={uploading}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        {/* Content Body */}
        <div className={styles.body}>
          {/* File details banner */}
          <div className={styles.fileSummary}>
            <div className={styles.fileIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </div>
            <div className={styles.fileInfo}>
              <span className={styles.fileName} title={file.name}>
                {file.name}
              </span>
              <span className={styles.fileSize}>
                {formatFileSize(file.size)}
              </span>
            </div>
            <span className={styles.noGpsBadge}>No GPS</span>
          </div>

          <p id="gps-modal-desc" className={styles.description}>
            This photo does not contain embedded GPS EXIF metadata. It can still be saved to your Google Drive, but its location will not be marked on the map or recorded with coordinates in your Google Sheet log.
          </p>

          {/* Device recommendation hint */}
          <div className={styles.tipBox}>
            <div className={styles.tipIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <div className={styles.tipText}>
              <strong>Helpful Tip:</strong> To include location coordinates in future photos, turn on <em>Location / GPS Tagging</em> in your phone or camera app settings before capturing photos.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            ref={cancelBtnRef}
            type="button"
            id="gps-modal-cancel-btn"
            className={styles.cancelBtn}
            onClick={onCancel}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            type="button"
            id="gps-modal-confirm-btn"
            className={styles.confirmBtn}
            onClick={onConfirm}
            disabled={uploading}
            aria-busy={uploading}
          >
            {uploading ? (
              <span className={styles.btnLoading}>
                <span className={styles.spinner} />
                <span>Uploading…</span>
              </span>
            ) : (
              'Upload anyway'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GpsWarningModal;
