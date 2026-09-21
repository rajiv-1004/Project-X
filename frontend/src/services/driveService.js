import { apiRequest } from './api';

/**
 * driveService.js — all Drive and Sheets interactions go through the backend.
 *
 * The frontend never calls Google APIs directly. All functions here
 * call authenticated backend endpoints which use the googleapis Node client.
 */

/**
 * Upload a photo File to the user's Drive folder.
 * GPS coordinates (if extracted client-side) are included in the FormData
 * so the backend can log them to the Sheet in the same request.
 *
 * The backend's /upload endpoint calls findOrCreateFolder internally, so we
 * do NOT need a separate ensureFolder call before uploading — that would be
 * a redundant API round-trip.
 *
 * @param {File}   file  - The photo file object
 * @param {string} token - Session token
 * @param {{ latitude: number, longitude: number }|null} gps - GPS from exifr
 * @returns {Promise<{ fileId: string, name: string, webViewLink: string, thumbnailLink: string, lat: number|null, lng: number|null }>}
 */
export async function uploadPhoto(file, token, gps = null) {
  const formData = new FormData();
  formData.append('photo', file);

  // Append GPS only when present; backend treats missing fields as null
  if (gps?.latitude != null) formData.append('lat', String(gps.latitude));
  if (gps?.longitude != null) formData.append('lng', String(gps.longitude));

  // Do NOT pass custom Content-Type header — apiRequest detects FormData
  // and lets the browser set the correct multipart boundary automatically.
  return apiRequest('/api/drive/upload', { method: 'POST', body: formData }, token);
}

/**
 * Fetch all photos from the user's Drive folder (metadata + GPS from Sheet).
 * @param {string} token - Session token
 * @returns {Promise<Array<{ fileId, name, thumbnailLink, webViewLink, lat, lng }>>}
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

/**
 * Fetch authenticated image blob URL for private Drive files.
 * @param {string} fileId
 * @param {string} token
 * @returns {Promise<string>} Blob URL
 */
export async function fetchThumbnailBlob(fileId, token) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000';
  const res = await fetch(`${backendUrl}/api/drive/thumbnail/${fileId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Thumbnail fetch failed');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
