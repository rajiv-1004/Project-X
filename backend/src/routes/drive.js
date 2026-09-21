import express from 'express';
import multer from 'multer';
import { getAuthedClient } from '../config/googleClient.js';
import { findOrCreateFolder } from '../services/driveService.js';
import { findOrCreateSheet, logToSheet } from '../services/sheetsService.js';
import { uploadFileToDrive } from '../services/driveService.js';
import { grantDrivePermission } from '../services/driveService.js';

const router = express.Router();

// Store uploaded files in memory; 20 MB limit matches frontend validation
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

/**
 * Middleware — extract the Bearer token and build an authed Google client.
 * Attaches `req.authClient` and `req.accessToken` for downstream handlers.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated.' });

  req.accessToken = token;
  req.authClient  = getAuthedClient({ access_token: token });
  next();
}

// ─── POST /api/drive/folder ───────────────────────────────────────────────────
/**
 * Ensure the user's Drive folder exists; create it only if absent.
 * Idempotent — safe to call multiple times (no duplicates created).
 */
router.post('/folder', requireAuth, async (req, res) => {
  try {
    const folderId = await findOrCreateFolder(req.authClient);
    return res.json({ folderId });
  } catch (err) {
    console.error('[drive/folder]', err.message ?? err);
    return res.status(502).json({ error: 'Could not access your Drive folder.' });
  }
});

// ─── POST /api/drive/upload ───────────────────────────────────────────────────
/**
 * Upload a photo to the user's Drive folder and log GPS to Sheets.
 * Accepts multipart/form-data with fields: photo (file), lat, lng (optional).
 */
router.post('/upload', requireAuth, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No photo file received.' });

  const lat = req.body.lat ? parseFloat(req.body.lat) : null;
  const lng = req.body.lng ? parseFloat(req.body.lng) : null;

  try {
    // 1. Ensure folder
    const folderId = await findOrCreateFolder(req.authClient);

    // 2. Upload file to Drive
    const fileData = await uploadFileToDrive(req.authClient, req.file, folderId);

    // 3. Log to Sheet (non-fatal if it fails)
    try {
      const sheetId = await findOrCreateSheet(req.authClient, folderId);
      await logToSheet(req.authClient, sheetId, {
        fileName: fileData.name,
        fileLink: fileData.webViewLink,
        lat,
        lng,
        timestamp: new Date().toISOString(),
      });
    } catch (sheetErr) {
      // Sheet logging failure is logged but does NOT fail the upload response
      console.error('[drive/upload] sheet logging failed:', sheetErr.message ?? sheetErr);
    }

    return res.json({ ...fileData, lat, lng });
  } catch (err) {
    console.error('[drive/upload]', err.message ?? err);
    return res.status(502).json({ error: 'We couldn\'t upload this photo. Please try again.' });
  }
});

// ─── GET /api/drive/photos ────────────────────────────────────────────────────
/**
 * List all photos in the user's Drive folder with GPS data from the Sheet.
 */
router.get('/photos', requireAuth, async (req, res) => {
  try {
    const folderId = await findOrCreateFolder(req.authClient);
    const { listPhotosFromDrive } = await import('../services/driveService.js');
    const { getGpsDataFromSheet }  = await import('../services/sheetsService.js');

    const files = await listPhotosFromDrive(req.authClient, folderId);
    const sheetId = await findOrCreateSheet(req.authClient, folderId);
    const gpsMap  = await getGpsDataFromSheet(req.authClient, sheetId);

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
 * Uses Drive permissions — NOT a public link.
 */
router.post('/share/:fileId', requireAuth, async (req, res) => {
  const { fileId } = req.params;
  const { emailAddress } = req.body ?? {};

  if (!emailAddress || typeof emailAddress !== 'string') {
    return res.status(400).json({ error: 'emailAddress is required.' });
  }

  try {
    await grantDrivePermission(req.authClient, fileId, emailAddress);
    return res.status(204).end();
  } catch (err) {
    console.error('[drive/share]', err.message ?? err);
    return res.status(502).json({ error: 'Sharing failed. Please check the email and try again.' });
  }
});

export default router;
