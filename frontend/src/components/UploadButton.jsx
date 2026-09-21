import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadPhoto, ensureFolder } from '../services/driveService';
import { extractGPS } from '../utils/exifUtils';
import { validateImageFile } from '../utils/fileUtils';
import styles from './UploadButton.module.css';

/**
 * UploadButton — handles the full upload flow:
 *  1. Validate file type and size
 *  2. Extract GPS EXIF client-side
 *  3. Ensure the user's Drive folder exists
 *  4. POST the file + GPS coords to the backend
 *
 * GPS is extracted before upload so the backend can log it to Sheets
 * in the same request, avoiding a second round-trip.
 */
function UploadButton({ onUploaded }) {
  const { token } = useAuth();
  const inputRef   = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState(null);
  const [success, setSuccess]     = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    setError(null);
    setSuccess(null);

    // 1. Validate before doing anything
    const { valid, error: validErr } = validateImageFile(file);
    if (!valid) { setError(validErr); return; }

    setUploading(true);
    try {
      // 2. Extract GPS client-side (non-blocking — continues even if null)
      const gps = await extractGPS(file);

      // 3. Ensure folder exists (backend is idempotent — no duplicates)
      await ensureFolder(token);

      // 4. Upload; backend receives the file and the GPS data in FormData
      const result = await uploadPhoto(file, token, gps);
      setSuccess(`"${result.name}" uploaded successfully.`);
      if (onUploaded) onUploaded(result);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[UploadButton] upload error:', err);
      setError('We couldn\'t upload this photo. Please check your connection and try again.');
    } finally {
      setUploading(false);
      // Clear the input so the same file can be re-selected after an error
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={styles.wrapper}>
      <input
        id="photo-file-input"
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className={styles.hiddenInput}
        onChange={handleFileChange}
        disabled={uploading}
        aria-label="Choose a photo to upload"
        capture="environment"
      />
      <button
        id="upload-btn"
        className={styles.btn}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-busy={uploading}
      >
        {uploading ? 'Uploading…' : '+ Upload Photo'}
      </button>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {success && <p className={styles.success} role="status">{success}</p>}
    </div>
  );
}

export default UploadButton;
