import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadPhoto } from '../services/driveService';
import { extractGPS } from '../utils/exifUtils';
import { validateImageFile } from '../utils/fileUtils';
import styles from './UploadButton.module.css';

/**
 * UploadButton — handles file selection & direct camera capture with:
 *  1. Client-side validation (file type and size).
 *  2. EXIF GPS extraction via exifr.
 *  3. Streaming upload to backend -> Drive & Google Sheet.
 *
 * Supports two presentation variants:
 *  - 'hero' (default): Large SaaS drag-and-drop card with dual action buttons.
 *  - 'compact': Slim header button for the Gallery view.
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

  const processFile = async (file) => {
    if (!file) return;

    setError(null);
    setSuccess(null);

    // 1. Client-side validation
    const { valid, error: validErr } = validateImageFile(file);
    if (!valid) {
      setError(validErr);
      return;
    }

    setUploading(true);
    setUploadProgress('Extracting GPS metadata…');

    try {
      // 2. Extract GPS from EXIF
      const gps = await extractGPS(file);
      if (gps) {
        setUploadProgress(`GPS found (${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}). Uploading…`);
      } else {
        setUploadProgress('Uploading photo to Google Drive…');
      }

      // 3. Upload to backend (Drive + Sheets)
      const result = await uploadPhoto(file, token, gps);
      setSuccess(`"${result.name}" successfully uploaded and logged.`);
      if (onUploaded) onUploaded(result);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[UploadButton] upload error:', err);
      setError("We couldn't upload this photo. Please check your connection and try again.");
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
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

  // Compact variant for Gallery header
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>{uploading ? 'Uploading…' : 'Upload Photo'}</span>
        </button>
      </div>
    );
  }

  // Hero variant for Dashboard Home / Upload tab
  return (
    <div
      className={`${styles.heroCard} ${dragActive ? styles.dragActive : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* File input (standard file picker) */}
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

      {/* Camera input (direct device camera capture) */}
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

      {/* Upload icon badge */}
      <div className={styles.iconCircle}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
      </div>

      <h2 className={styles.heroTitle}>Upload or Take a Photo</h2>
      <p className={styles.heroSubtitle}>
        Upload photos of documents or applications. GPS coordinates will be extracted and logged into your Google Sheet automatically.
      </p>

      {/* Action buttons */}
      <div className={styles.actionButtons}>
        <button
          id="upload-btn"
          type="button"
          className={styles.btnPrimary}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-busy={uploading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Choose Files</span>
        </button>

        <button
          id="camera-btn"
          type="button"
          className={styles.btnSecondary}
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading}
          aria-busy={uploading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
          <span>Take Photo</span>
        </button>
      </div>

      <p className={styles.formatHint}>
        Supported: JPG, PNG, WEBP, HEIC &bull; Maximum file size: 20MB
      </p>

      {/* Progress & Feedback states */}
      {uploading && (
        <div className={styles.progressBox}>
          <div className={styles.spinner} />
          <span>{uploadProgress || 'Processing upload…'}</span>
        </div>
      )}

      {error && (
        <div className={styles.alertError} role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className={styles.alertSuccess} role="status">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}

export default UploadButton;
