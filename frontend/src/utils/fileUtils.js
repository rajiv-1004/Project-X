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
