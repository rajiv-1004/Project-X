/**
 * fileUtils.js — validation helpers for photo uploads.
 */

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Validate a File before upload.
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateImageFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload a JPEG, PNG, WebP, or HEIC image.',
    };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `File is too large. Maximum allowed size is ${MAX_SIZE_BYTES / (1024 * 1024)} MB.`,
    };
  }
  return { valid: true };
}

/**
 * Format bytes into a human-readable string.
 * @param {number} bytes
 * @returns {string} e.g. "4.2 MB"
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Extract or derive capture/upload timestamp from photo record.
 * 1. Checks Drive createdTime
 * 2. Checks Google Sheet timestamp
 * 3. Falls back to parsing camera filename pattern (e.g., IMG20260919213606.jpg)
 * @param {{ createdTime?: string, timestamp?: string, name?: string }} photo
 * @returns {Date | null}
 */
export function extractPhotoTimestamp(photo) {
  if (!photo) return null;
  const raw = photo.createdTime || photo.timestamp;
  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
  }

  // Camera filename fallback (e.g. IMG20260919213606 or IMG_20260919_213606)
  if (photo.name) {
    const match = photo.name.match(/(?:IMG[-_]?)?(\d{4})(\d{2})(\d{2})[-_]?(\d{2})(\d{2})(\d{2})/i);
    if (match) {
      const [, y, m, d, hr, min, sec] = match;
      const parsed = new Date(Number(y), Number(m) - 1, Number(d), Number(hr), Number(min), Number(sec));
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  return null;
}
