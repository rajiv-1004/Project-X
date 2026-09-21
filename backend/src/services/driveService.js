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

/**
 * Derive the canonical folder name for this user.
 * Falls back to 'ProjectX-Photos' only if the profile name is unavailable.
 *
 * @param {import('googleapis').Auth.OAuth2Client} authClient
 * @returns {Promise<string>} The user's display name
 */
async function getUserFolderName(authClient) {
  try {
    const people = google.people({ version: 'v1', auth: authClient });
    const { data } = await people.people.get({
      resourceName: 'people/me',
      personFields: 'names',
    });
    const name = data.names?.[0]?.displayName;
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
    // Folder already exists — return its ID, no duplicate created
    return { folderId: data.files[0].id, folderName };
  }

  // No existing folder — create it now
  const { data: newFolder } = await drive.files.create({
    requestBody: { name: folderName, mimeType: FOLDER_MIME },
    fields: 'id',
  });

  return { folderId: newFolder.id, folderName };
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
export async function grantDrivePermission(authClient, fileId, emailAddress) {
  const drive = google.drive({ version: 'v3', auth: authClient });

  await drive.permissions.create({
    fileId,
    requestBody: {
      type:         'user',
      role:         'writer',
      emailAddress,
    },
    // Set to true if you want the target to receive an email notification
    sendNotificationEmail: false,
  });
}
