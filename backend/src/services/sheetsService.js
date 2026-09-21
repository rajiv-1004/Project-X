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

  // Create the spreadsheet inside the folder
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  const { data: newSheet } = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: SHEET_NAME },
      sheets: [{
        properties: { title: 'Locations' },
        data: [{
          startRow: 0,
          startColumn: 0,
          rowData: [{
            values: [
              { userEnteredValue: { stringValue: 'Photo Name' } },
              { userEnteredValue: { stringValue: 'Drive Link' } },
              { userEnteredValue: { stringValue: 'Latitude' } },
              { userEnteredValue: { stringValue: 'Longitude' } },
              { userEnteredValue: { stringValue: 'Timestamp' } },
            ],
          }],
        }],
      }],
    },
  });

  const sheetFileId = newSheet.spreadsheetId;

  // Move the newly created sheet into the Drive folder
  await drive.files.update({
    fileId: sheetFileId,
    addParents: folderId,
    removeParents: 'root',
    fields: 'id, parents',
  });

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
    range: 'Locations!A:E',
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
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Locations!A:E',
  });

  const rows = data.values ?? [];
  const gpsMap = {};

  // Skip the header row (index 0)
  for (let i = 1; i < rows.length; i++) {
    const [name, , latStr, lngStr] = rows[i];
    if (!name) continue;
    gpsMap[name] = {
      lat: latStr ? parseFloat(latStr) : null,
      lng: lngStr ? parseFloat(lngStr) : null,
    };
  }

  return gpsMap;
}

/**
 * Read the full Sheet data including rows and web URL.
 *
 * @param {import('googleapis').Auth.OAuth2Client} authClient
 * @param {string} spreadsheetId
 * @returns {Promise<{ spreadsheetId: string, spreadsheetUrl: string, rows: string[][] }>}
 */
export async function getSheetData(authClient, spreadsheetId) {
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  const [metaRes, valRes] = await Promise.all([
    sheets.spreadsheets.get({ spreadsheetId, fields: 'spreadsheetUrl' }).catch(() => ({ data: {} })),
    sheets.spreadsheets.values.get({ spreadsheetId, range: 'Locations!A:E' }),
  ]);

  return {
    spreadsheetId,
    spreadsheetUrl: metaRes.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    rows: valRes.data.values ?? [],
  };
}
