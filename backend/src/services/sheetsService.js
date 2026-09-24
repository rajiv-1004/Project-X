import { google } from 'googleapis';

/**
 * sheetsService.js — all Google Sheets API calls.
 *
 * Key design decisions:
 * - findOrCreateSheet searches for an existing sheet inside the Drive folder
 *   before creating one, preventing duplicates across sessions.
 * - GPS rows are appended; the sheet is never overwritten.
 * - getGpsDataFromSheet reads all rows and returns a name→coords map so the
 *   caller can do a single O(n) join rather than n separate API calls.
 */

const SHEET_NAME = 'GPS Log';

// In-session cache: folderId -> spreadsheetId
// Avoids repeated Drive file search calls for the spreadsheet within the same session.
const _sheetCache = new Map();

/**
 * Find the GPS Log Sheet inside the user's folder, or create it if absent.
 * Guaranteed to never produce duplicates.
 *
 * @param {import('googleapis').Auth.OAuth2Client} authClient
 * @param {string} folderId - The parent Drive folder ID
 * @returns {Promise<string>} The Spreadsheet ID
 */
export async function findOrCreateSheet(authClient, folderId) {
  if (_sheetCache.has(folderId)) {
    return _sheetCache.get(folderId);
  }

  const drive = google.drive({ version: 'v3', auth: authClient });

  // Search for an existing Sheet with this name in the folder (not trashed)
  const { data } = await drive.files.list({
    q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and name='${SHEET_NAME}' and trashed=false`,
    fields: 'files(id)',
    pageSize: 1,
  });

  if (data.files?.length > 0) {
    const id = data.files[0].id;
    _sheetCache.set(folderId, id);
    return id;
  }

  // Create the spreadsheet directly inside the folder using Drive API
  const { data: newSheetFile } = await drive.files.create({
    requestBody: {
      name: SHEET_NAME,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: [folderId],
    },
    fields: 'id',
  });

  const sheetFileId = newSheetFile.id;

  // Initialize the header row using Sheets API
  try {
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetFileId,
      range: 'A1:E1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          ['Photo Name', 'Drive Link', 'Latitude', 'Longitude', 'Timestamp'],
        ],
      },
    });
  } catch (initErr) {
    console.warn('[sheetsService] header initialization warning:', initErr.message ?? initErr);
  }

  _sheetCache.set(folderId, sheetFileId);
  return sheetFileId;
}

/**
 * Append a GPS log row to the sheet.
 *
 * @param {import('googleapis').Auth.OAuth2Client} authClient
 * @param {string} spreadsheetId
 * @param {{ fileName, fileLink, lat, lng, timestamp }} entry
 */
export async function logToSheet(authClient, spreadsheetId, { fileName, fileLink, lat, lng, timestamp }) {
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'A:E',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        fileName,
        fileLink,
        lat ?? '',
        lng ?? '',
        timestamp,
      ]],
    },
  });
}

/**
 * Read all GPS rows and return a map keyed by photo name for O(1) lookup.
 *
 * @param {import('googleapis').Auth.OAuth2Client} authClient
 * @param {string} spreadsheetId
 * @returns {Promise<Record<string, { lat: number|null, lng: number|null }>>}
 */
export async function getGpsDataFromSheet(authClient, spreadsheetId) {
  if (!spreadsheetId) return {};
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  try {
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A:E',
    });

    const rows = data.values ?? [];
    const gpsMap = {};

    // Skip the header row (index 0)
    for (let i = 1; i < rows.length; i++) {
      const [name, , latStr, lngStr, timestamp] = rows[i];
      if (!name) continue;
      gpsMap[name] = {
        lat: latStr ? parseFloat(latStr) : null,
        lng: lngStr ? parseFloat(lngStr) : null,
        timestamp: timestamp || null,
      };
    }

    return gpsMap;
  } catch (err) {
    console.warn('[sheetsService] getGpsDataFromSheet error:', err.message ?? err);
    return {};
  }
}

/**
 * Read the full Sheet data including rows and web URL.
 *
 * @param {import('googleapis').Auth.OAuth2Client} authClient
 * @param {string} spreadsheetId
 * @returns {Promise<{ spreadsheetId: string, spreadsheetUrl: string, rows: string[][] }>}
 */
export async function getSheetData(authClient, spreadsheetId) {
  if (!spreadsheetId) return { spreadsheetId: '', spreadsheetUrl: '', rows: [] };
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  const [metaRes, valRes] = await Promise.all([
    sheets.spreadsheets.get({ spreadsheetId, fields: 'spreadsheetUrl' }).catch(() => ({ data: {} })),
    sheets.spreadsheets.values.get({ spreadsheetId, range: 'A:E' }).catch(() => ({ data: { values: [] } })),
  ]);

  return {
    spreadsheetId,
    spreadsheetUrl: metaRes.data?.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    rows: valRes.data?.values ?? [],
  };
}
