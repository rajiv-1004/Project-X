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
 * @param {string} [role='writer'] - 'reader' or 'writer'
 * @param {boolean} [notify=false] - send notification email
 * @returns {Promise<void>}
 */
export async function sharePhoto(fileId, emailAddress, token, role = 'writer', notify = false) {
  return apiRequest(
    `/api/drive/share/${fileId}`,
    { method: 'POST', body: JSON.stringify({ emailAddress, role, notify }) },
    token
  );
}

/**
 * Fetch real Google Sheet metadata and rows.
 * @param {string} token - Session token
 * @returns {Promise<{ spreadsheetId: string, spreadsheetUrl: string, rows: string[][] }>}
 */
export async function fetchSheetData(token) {
  return apiRequest('/api/drive/sheet', {}, token);
}

/**
 * Fetch Drive folder and Sheet info (name, IDs, links).
 * @param {string} token - Session token
 * @returns {Promise<{ folderId: string, folderName: string, sheetId: string, folderUrl: string, sheetUrl: string }>}
 */
export async function fetchDriveInfo(token) {
  return apiRequest('/api/drive/info', {}, token);
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
