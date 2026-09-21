import express from 'express';
import multer from 'multer';
import { getAuthedClient } from '../config/googleClient.js';
import {
  findOrCreateFolder,
  uploadFileToDrive,
  listPhotosFromDrive,
  grantDrivePermission,
  getPhotoStream,
} from '../services/driveService.js';
import {
  findOrCreateSheet,
  logToSheet,
  getGpsDataFromSheet,
  getSheetData,
} from '../services/sheetsService.js';

const router = express.Router();

// Store uploaded files in memory; 20 MB limit matches frontend validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

/**
 * Middleware — extract the Bearer token and build an authed Google client.
 * Attaches req.authClient for downstream handlers.
 * The raw token never appears in logs or responses.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated.' });

  req.authClient = getAuthedClient({ access_token: token });
  next();
}

// ─── POST /api/drive/folder ───────────────────────────────────────────────────
/**
 * Ensure the user's Drive folder exists; create it only if absent.
 * Idempotent — safe to call multiple times without creating duplicates.
 * The folder is named after the authenticated user's Google display name.
 */
router.post('/folder', requireAuth, async (req, res) => {
  try {
    const { folderId, folderName } = await findOrCreateFolder(req.authClient);
    return res.json({ folderId, folderName });
  } catch (err) {
    console.error('[drive/folder]', err.message ?? err);
    return res.status(502).json({ error: 'Could not access your Drive folder.' });
  }
});

// ─── GET /api/drive/info ──────────────────────────────────────────────────────
/**
 * Return Drive folder and Sheet info (name, id, links) for dashboard/settings.
 */
router.get('/info', requireAuth, async (req, res) => {
  try {
    const { folderId, folderName } = await findOrCreateFolder(req.authClient);
    const sheetId = await findOrCreateSheet(req.authClient, folderId);
    return res.json({
      folderId,
      folderName,
      sheetId,
      folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}`,
    });
  } catch (err) {
    console.error('[drive/info]', err.message ?? err);
    return res.status(502).json({ error: 'Could not fetch Drive info.' });
  }
});

// ─── POST /api/drive/upload ───────────────────────────────────────────────────
/**
 * Upload a photo to the user's Drive folder and log GPS to Sheets.
 * Accepts multipart/form-data with fields:
 *   - photo  (File, required)
 *   - lat    (string, optional)
 *   - lng    (string, optional)
 *
 * Folder existence is checked here — the frontend does NOT need a separate
 * /folder call before uploading.
 */
router.post('/upload', requireAuth, upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No photo file received.' });
  }

  const lat = req.body.lat ? parseFloat(req.body.lat) : null;
  const lng = req.body.lng ? parseFloat(req.body.lng) : null;

  try {
    // 1. Ensure the user's folder exists (idempotent, no duplicates)
    const { folderId } = await findOrCreateFolder(req.authClient);

    // 2. Upload the file to Drive
    const fileData = await uploadFileToDrive(req.authClient, req.file, folderId);

    // 3. Log GPS to Sheet — non-fatal: a sheet failure does not fail the upload
    try {
      const sheetId = await findOrCreateSheet(req.authClient, folderId);
      await logToSheet(req.authClient, sheetId, {
        fileName:  fileData.name,
        fileLink:  fileData.webViewLink,
        lat,
        lng,
        timestamp: new Date().toISOString(),
      });
    } catch (sheetErr) {
      console.error('[drive/upload] sheet logging failed (non-fatal):', sheetErr.message ?? sheetErr);
    }

    return res.json({ ...fileData, lat, lng });
  } catch (err) {
    console.error('[drive/upload]', err.message ?? err);
    return res.status(502).json({ error: "We couldn't upload this photo. Please try again." });
  }
});

// ─── GET /api/drive/photos ────────────────────────────────────────────────────
/**
 * List all photos in the user's Drive folder with GPS data joined from the Sheet.
 * All imports are at the top of the file — no dynamic imports inside handlers.
 */
router.get('/photos', requireAuth, async (req, res) => {
  try {
    const { folderId } = await findOrCreateFolder(req.authClient);

    // Fetch Drive files and Sheet GPS data in parallel for efficiency
    const [files, sheetId] = await Promise.all([
      listPhotosFromDrive(req.authClient, folderId),
      findOrCreateSheet(req.authClient, folderId),
    ]);

    const gpsMap = await getGpsDataFromSheet(req.authClient, sheetId);

    const photos = files.map((f) => ({
      ...f,
      lat: gpsMap[f.name]?.lat ?? null,
      lng: gpsMap[f.name]?.lng ?? null,
    }));

    return res.json(photos);
  } catch (err) {
    console.error('[drive/photos]', err.message ?? err);
    return res.status(502).json({ error: 'Could not load your photos.' });
  }
});

// ─── POST /api/drive/share/:fileId ───────────────────────────────────────────
/**
 * Share a Drive file with a specific Google account.
 * Uses Drive user-level permissions — NOT a public link.
 */
router.post('/share/:fileId', requireAuth, async (req, res) => {
  const { fileId } = req.params;
  const { emailAddress, role, notify } = req.body ?? {};

  if (!emailAddress || typeof emailAddress !== 'string' || !emailAddress.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  try {
    await grantDrivePermission(req.authClient, fileId, emailAddress.trim(), role, notify);
    return res.status(204).end();
  } catch (err) {
    console.error('[drive/share]', err.message ?? err);
    return res.status(502).json({ error: 'Sharing failed. Please check the email and try again.' });
  }
});

// ─── GET /api/drive/sheet ─────────────────────────────────────────────────────
/**
 * Return real Google Sheet metadata and rows for the user's GPS log spreadsheet.
 */
router.get('/sheet', requireAuth, async (req, res) => {
  try {
    const { folderId } = await findOrCreateFolder(req.authClient);
    const sheetId = await findOrCreateSheet(req.authClient, folderId);
    const sheetData = await getSheetData(req.authClient, sheetId);
    return res.json(sheetData);
  } catch (err) {
    console.error('[drive/sheet]', err.message ?? err);
    return res.status(502).json({ error: 'Could not load Google Sheet data.' });
  }
});

// ─── GET /api/drive/thumbnail/:fileId ─────────────────────────────────────────
/**
 * Stream image content for private Drive files.
 * Avoids Google CDN third-party cookie blocking in modern browsers.
 */
router.get('/thumbnail/:fileId', requireAuth, async (req, res) => {
  const { fileId } = req.params;
  try {
    const response = await getPhotoStream(req.authClient, fileId);
    if (response.headers['content-type']) {
      res.setHeader('Content-Type', response.headers['content-type']);
    }
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return response.data.pipe(res);
  } catch (err) {
    console.error('[drive/thumbnail]', err.message ?? err);
    return res.status(404).end();
  }
});

export default router;
