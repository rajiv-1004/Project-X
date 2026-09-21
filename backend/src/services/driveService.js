import { google } from 'googleapis';
import { Readable } from 'stream';

/**
 * driveService.js — all Google Drive API calls.
 *
 * Key design decisions:
 * - findOrCreateFolder always searches before creating to prevent duplicates.
 *   The folder name is the authenticated user's display name (from their
 *   Google profile), NOT a hardcoded string.
 * - uploadFileToDrive streams the multer buffer; no temp files needed.
 * - grantDrivePermission uses a 'user' type permission, NOT a public link.
 */

const FOLDER_MIME = 'application/vnd.google-apps.folder';

// In-session cache: maps user token/name -> { folderId, folderName }
// Prevents redundant Drive API searches within the same session.
const _folderCache = new Map();

/**
 * Derive the canonical folder name for this user.
 * Falls back to 'ProjectX-Photos' only if the profile name is unavailable.
 *
 * @param {import('googleapis').Auth.OAuth2Client} authClient
 * @returns {Promise<string>} The user's display name
 */
async function getUserFolderName(authClient) {
  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: authClient });
    const { data } = await oauth2.userinfo.get();
    const name = data.name;
    if (name && name.trim()) return name.trim();
  } catch (err) {
    // Non-fatal — fall back to a safe default
    console.error('[driveService] could not fetch user name for folder:', err.message ?? err);
  }
  return 'ProjectX-Photos';
}

/**
 * Find the user's Drive folder (named after them), or create it if absent.
 * Guaranteed to never produce duplicates: searches by exact name + mimeType
 * before creating.
 *
 * @param {import('googleapis').Auth.OAuth2Client} authClient
 * @returns {Promise<{ folderId: string, folderName: string }>}
 */
export async function findOrCreateFolder(authClient) {
  const cacheKey = authClient.credentials?.access_token;
  if (cacheKey && _folderCache.has(cacheKey)) {
    return _folderCache.get(cacheKey);
  }

  const drive      = google.drive({ version: 'v3', auth: authClient });
  const folderName = await getUserFolderName(authClient);

  // Search for an existing folder with this exact name (not trashed).
  // Using name= inside the q filter does a case-insensitive exact match.
  const { data } = await drive.files.list({
    q: `mimeType='${FOLDER_MIME}' and name='${folderName}' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
    pageSize: 1,
  });

  if (data.files?.length > 0) {
    // Folder already exists — cache and return its ID, no duplicate created
    const result = { folderId: data.files[0].id, folderName };
    if (cacheKey) _folderCache.set(cacheKey, result);
    return result;
  }

  // If a legacy 'ProjectX-Photos' folder exists from earlier, rename it to the user's name
  if (folderName !== 'ProjectX-Photos') {
    const { data: legacyData } = await drive.files.list({
      q: `mimeType='${FOLDER_MIME}' and name='ProjectX-Photos' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
      pageSize: 1,
    });

    if (legacyData.files?.length > 0) {
      const legacyId = legacyData.files[0].id;
      await drive.files.update({
        fileId: legacyId,
        requestBody: { name: folderName },
      });
      const result = { folderId: legacyId, folderName };
      if (cacheKey) _folderCache.set(cacheKey, result);
      return result;
    }
  }

  // No existing folder — create it now
  const { data: newFolder } = await drive.files.create({
    requestBody: { name: folderName, mimeType: FOLDER_MIME },
    fields: 'id',
  });

  const result = { folderId: newFolder.id, folderName };
  if (cacheKey) _folderCache.set(cacheKey, result);
  return result;
}

/**
 * Upload a file (from multer's memory buffer) to a Drive folder.
 *
 * @param {import('googleapis').Auth.OAuth2Client} authClient
 * @param {import('express').Request['file']} multerFile
 * @param {string} folderId
 * @returns {Promise<{ fileId, name, webViewLink, thumbnailLink }>}
 */
export async function uploadFileToDrive(authClient, multerFile, folderId) {
  const drive  = google.drive({ version: 'v3', auth: authClient });
  const stream = Readable.from(multerFile.buffer);

  const { data } = await drive.files.create({
    requestBody: {
      name:    multerFile.originalname,
      parents: [folderId],
    },
    media: {
      mimeType: multerFile.mimetype,
      body:     stream,
    },
    fields: 'id, name, webViewLink, thumbnailLink',
  });

  return {
    fileId:        data.id,
    name:          data.name,
    webViewLink:   data.webViewLink,
    thumbnailLink: data.thumbnailLink,
  };
}

/**
 * List all image files in a Drive folder (metadata only, no file contents).
 *
 * @param {import('googleapis').Auth.OAuth2Client} authClient
 * @param {string} folderId
 * @returns {Promise<Array<{ fileId, name, thumbnailLink, webViewLink }>>}
 */
export async function listPhotosFromDrive(authClient, folderId) {
  const drive = google.drive({ version: 'v3', auth: authClient });

  const { data } = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`,
    fields: 'files(id, name, thumbnailLink, webViewLink)',
    orderBy: 'createdTime desc',
    pageSize: 100,
  });

  return (data.files ?? []).map((f) => ({
    fileId:        f.id,
    name:          f.name,
    thumbnailLink: f.thumbnailLink,
    webViewLink:   f.webViewLink,
  }));
}

/**
 * Share a Drive file with a specific Google account using a 'writer' role.
 * Uses Drive user-level permissions — NOT a public link.
 *
 * @param {import('googleapis').Auth.OAuth2Client} authClient
 * @param {string} fileId
 * @param {string} emailAddress - Target Google account
 */
export async function grantDrivePermission(authClient, fileId, emailAddress, role = 'writer', sendNotificationEmail = false) {
  const drive = google.drive({ version: 'v3', auth: authClient });

  await drive.permissions.create({
    fileId,
    requestBody: {
      type:         'user',
      role:         role === 'reader' ? 'reader' : 'writer',
      emailAddress,
    },
    sendNotificationEmail: Boolean(sendNotificationEmail),
  });
}

/**
 * Stream an image file directly from Drive.
 *
 * @param {import('googleapis').Auth.OAuth2Client} authClient
 * @param {string} fileId
 * @returns {Promise<import('gaxios').GaxiosResponse<import('stream').Readable>>}
 */
export async function getPhotoStream(authClient, fileId) {
  const drive = google.drive({ version: 'v3', auth: authClient });
  return drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
}
