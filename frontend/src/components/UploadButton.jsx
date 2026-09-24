import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadPhoto } from '../services/driveService';
import { extractGPS } from '../utils/exifUtils';
import { validateImageFile, formatFileSize } from '../utils/fileUtils';
import GpsWarningModal from './GpsWarningModal';
import styles from './UploadButton.module.css';

/**
 * UploadButton — Geospatial document and photo ingestion workspace:
 *  1. Client-side validation (format & 20MB limit).
 *  2. EXIF GPS extraction via exifr before any network calls.
 *  3. Visual file preview with filename, size, and GPS detection badge.
 *  4. Missing GPS confirmation dialog (GpsWarningModal) allowing user to Cancel or Upload anyway.
 *  5. Direct device camera capture support.
 */
function UploadButton({ onUploaded, variant = 'hero' }) {
  const { token } = useAuth();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);

  // Active file preview state
  const [activeFile, setActiveFile] = useState(null);
  const [activePreviewUrl, setActivePreviewUrl] = useState(null);
  const [activeGps, setActiveGps] = useState(null);

  useEffect(() => {
    return () => {
      if (activePreviewUrl) URL.revokeObjectURL(activePreviewUrl);
    };
  }, [activePreviewUrl]);

  const resetInputs = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const clearActivePreview = () => {
    if (activePreviewUrl) URL.revokeObjectURL(activePreviewUrl);
    setActiveFile(null);
    setActivePreviewUrl(null);
    setActiveGps(null);
  };

  /**
   * Performs the upload to backend -> Drive & Google Sheet.
   */
  const executeUpload = async (file, gps = null) => {
    setUploading(true);
    setUploadProgress(
      gps
        ? `GPS locked (${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}). Uploading…`
        : 'Uploading photo to Google Drive…'
    );

    try {
      const result = await uploadPhoto(file, token, gps);
      setSuccess(`"${result.name}" successfully uploaded and logged.`);
      if (onUploaded) onUploaded(result);
      return true;
    } catch (err) {
      if (import.meta.env.DEV) console.error('[UploadButton] upload error:', err);
      setError("We couldn't upload this photo. Please check your connection and try again.");
      return false;
    } finally {
      setUploading(false);
      setUploadProgress('');
      resetInputs();
      setTimeout(clearActivePreview, 3000);
    }
  };

  /**
   * Processes a selected/dropped file:
   */
  const processFile = async (file) => {
    if (!file) return;

    setError(null);
    setSuccess(null);

    // 1. Client-side file validation
    const { valid, error: validErr } = validateImageFile(file);
    if (!valid) {
      setError(validErr);
      resetInputs();
      return;
    }

    // Create local preview
    const previewUrl = URL.createObjectURL(file);
    setActiveFile(file);
    setActivePreviewUrl(previewUrl);
    setUploading(true);
    setUploadProgress('Extracting GPS coordinates from EXIF…');

    try {
      const gps = await extractGPS(file);
      setActiveGps(gps);

      if (gps) {
        // GPS detected: upload immediately
        await executeUpload(file, gps);
      } else {
        // No GPS: show confirmation dialog
        setUploading(false);
        setUploadProgress('');
        setPendingFile(file);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[UploadButton] EXIF parse issue:', err);
      setActiveGps(null);
      setUploading(false);
      setUploadProgress('');
      setPendingFile(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleCancelModal = () => {
    setPendingFile(null);
    clearActivePreview();
    resetInputs();
  };

  const handleConfirmModal = async () => {
    if (!pendingFile) return;
    const fileToUpload = pendingFile;
    await executeUpload(fileToUpload, null);
    setPendingFile(null);
  };

  // ─── Compact variant (for headers) ─────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <div className={styles.compactWrapper}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className={styles.hiddenInput}
          onChange={handleFileChange}
          disabled={uploading}
          aria-label="Upload photo"
        />
        <button
          id="compact-upload-btn"
          className={styles.compactBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-busy={uploading}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>{uploading ? 'Uploading…' : 'Upload Photo'}</span>
        </button>

        {pendingFile && (
          <GpsWarningModal
            file={pendingFile}
            uploading={uploading}
            onConfirm={handleConfirmModal}
            onCancel={handleCancelModal}
          />
        )}
      </div>
    );
  }

  // ─── Workspace variant (Overview / Home tab) ────────────────────────────────
  return (
    <div className={styles.workspaceCard}>
      {/* Hidden file pickers */}
      <input
        id="photo-file-input"
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className={styles.hiddenInput}
        onChange={handleFileChange}
        disabled={uploading}
        aria-label="Choose a photo to upload"
      />
      <input
        id="photo-camera-input"
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        className={styles.hiddenInput}
        onChange={handleFileChange}
        disabled={uploading}
        aria-label="Take a photo with camera"
      />

      {/* Header with Title and CTAs */}
      <div className={styles.workspaceHeader}>
        <div className={styles.workspaceTitleGroup}>
          <h2 className={styles.workspaceTitle}>Upload Field Documentation</h2>
          <p className={styles.workspaceSubtitle}>
            Directly upload scans or take field photographs. GPS EXIF metadata is extracted and saved to Drive &amp; Sheets.
          </p>
        </div>

        <div className={styles.actionButtonGroup}>
          <button
            id="upload-btn"
            type="button"
            className={styles.btnPrimary}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-busy={uploading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Upload Photo</span>
          </button>

          <button
            id="camera-btn"
            type="button"
            className={styles.btnSecondary}
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            aria-busy={uploading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>Take Photo</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Surface */}
      <div
        className={`${styles.dropZone} ${dragActive ? styles.dragActive : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
      >
        <div className={styles.dropIcon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p className={styles.dropText}>
          Drag and drop photo here, or browse files from your computer
        </p>
        <span className={styles.dropHint}>
          JPG, PNG, WEBP, HEIC &bull; Up to 20MB
        </span>
      </div>

      {/* File Ingestion Preview (when a file has been selected) */}
      {activeFile && (
        <div className={styles.previewCard}>
          <div className={styles.previewLeft}>
            {activePreviewUrl ? (
              <img src={activePreviewUrl} alt={activeFile.name} className={styles.previewThumb} />
            ) : (
              <div className={styles.previewThumbFallback}>📷</div>
            )}
            <div className={styles.previewMeta}>
              <span className={styles.previewName}>{activeFile.name}</span>
              <div className={styles.previewSub}>
                <span>{formatFileSize(activeFile.size)}</span>
                {activeGps ? (
                  <span className={styles.badgeGpsFound}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    GPS Detected
                  </span>
                ) : (
                  <span className={styles.badgeNoGpsFound}>No GPS Metadata</span>
                )}
              </div>
            </div>
          </div>

          {uploading && (
            <div className={styles.progressBox}>
              <div className={styles.spinner} />
              <span>{uploadProgress || 'Processing upload…'}</span>
            </div>
          )}
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className={styles.alertError} role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className={styles.alertSuccess} role="status">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      {/* GPS Warning Modal */}
      {pendingFile && (
        <GpsWarningModal
          file={pendingFile}
          uploading={uploading}
          onConfirm={handleConfirmModal}
          onCancel={handleCancelModal}
        />
      )}
    </div>
  );
}

export default UploadButton;
