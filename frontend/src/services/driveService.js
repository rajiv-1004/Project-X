import { apiRequest } from './api';

/**
 * driveService.js — all Drive and Sheets interactions go through the backend.
 *
 * The frontend never calls Google APIs directly. All functions here
 * call authenticated backend endpoints which use the googleapis Node client.
 */

/**
 * Ensure the user's Drive folder exists (backend creates if missing).
 * @param {string} token - Session token
 * @returns {Promise<{ folderId: string }>}
 */
export async function ensureFolder(token) {
  return apiRequest('/api/drive/folder', { method: 'POST' }, token);
}

/**
 * Upload a photo File to the user's Drive folder.
 * @param {File}   file  - The photo file object
 * @param {string} token - Session token
 * @returns {Promise<{ fileId: string, name: string, webViewLink: string, gps: object|null }>}
 */
export async function uploadPhoto(file, token) {
  const formData = new FormData();
  formData.append('photo', file);

  // Do NOT set Content-Type here — browser sets it with the correct boundary
  return apiRequest(
    '/api/drive/upload',
    { method: 'POST', body: formData, headers: {} },
    token
  );
}

/**
 * Fetch all photos from the user's Drive folder (metadata + GPS from Sheet).
 * @param {string} token - Session token
 * @returns {Promise<Array<{ fileId, name, thumbnailLink, webViewLink, lat, lng, timestamp }>>}
 */
export async function listPhotos(token) {
  return apiRequest('/api/drive/photos', {}, token);
}

/**
 * Share a photo with a specific Google account via Drive permissions.
 * @param {string} fileId       - Drive file ID
 * @param {string} emailAddress - Target Google account
 * @param {string} token        - Session token
 * @returns {Promise<void>}
 */
export async function sharePhoto(fileId, emailAddress, token) {
  return apiRequest(
    `/api/drive/share/${fileId}`,
    { method: 'POST', body: JSON.stringify({ emailAddress }) },
    token
  );
}
