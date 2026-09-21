import { google } from 'googleapis';
import { Readable } from 'stream';

/**
 * driveService.js — all Google Drive API calls.
 *
 * Key design decisions:
 * - findOrCreateFolder always searches first before creating to prevent duplicates.
 * - uploadFileToDrive streams the file buffer; no temp files needed.
 * - grantDrivePermission uses a 'user' type permission, NOT a public link.
 * - The folder name comes from the authenticated user's profile so it's dynamic.
 */

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const FOLDER_NAME = 'ProjectX-Photos'; // Consistent name; customise as needed

/**
 * Find the user's ProjectX folder, or create it if it doesn't exist.
 * Guaranteed to never produce duplicates.
 *
 * @param {import('googleapis').Auth.OAuth2Client} authClient
 * @returns {Promise<string>} The Drive folder ID
 */
export async function findOrCreateFolder(authClient) {
  const drive = google.drive({ version: 'v3', auth: authClient });

  // Search for an existing folder with this exact name (not trashed)
  const { data } = await drive.files.list({
    q: `mimeType='${FOLDER_MIME}' and name='${FOLDER_NAME}' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
    pageSize: 1,
  });

  if (data.files?.length > 0) {
    // Folder already exists — return its ID without creating a duplicate
    return data.files[0].id;
  }

  // Create the folder
  const { data: newFolder } = await drive.files.create({
    requestBody: { name: FOLDER_NAME, mimeType: FOLDER_MIME },
    fields: 'id',
  });

  return newFolder.id;
}

/**
 * Upload a file (from multer's memory buffer) to a Drive folder.
 *
 * @param {import('googleapis').Auth.OAuth2Client} authClient
 * @param {Express.Multer.File} multerFile
 * @param {string} folderId
 * @returns {Promise<{ fileId, name, webViewLink, thumbnailLink }>}
 */
export async function uploadFileToDrive(authClient, multerFile, folderId) {
  const drive = google.drive({ version: 'v3', auth: authClient });

  const stream = Readable.from(multerFile.buffer);

  const { data } = await drive.files.create({
    requestBody: {
      name: multerFile.originalname,
      parents: [folderId],
    },
    media: {
      mimeType: multerFile.mimetype,
      body: stream,
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
 * List all image files in a Drive folder (metadata only).
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
    pageSize: 100, // Reasonable upper bound for this assessment
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
 * This is a Drive permission — NOT a public link.
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
      type: 'user',
      role: 'writer',
      emailAddress,
    },
    // Suppress the notification email to the target (set true if desired)
    sendNotificationEmail: false,
  });
}
