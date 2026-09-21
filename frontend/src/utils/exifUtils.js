import exifr from 'exifr';

/**
 * exifUtils.js — client-side GPS EXIF extraction using exifr.
 *
 * exifr is used because it parses EXIF on the client without uploading
 * the file first, avoiding unnecessary round-trips and API calls.
 * Only the GPS fields are requested to minimise memory use.
 */

/**
 * Extract GPS coordinates from an image File.
 *
 * @param {File} file - Image file to parse
 * @returns {Promise<{ latitude: number, longitude: number } | null>}
 *   Null if EXIF is absent, corrupt, or contains no GPS data.
 */
export async function extractGPS(file) {
  try {
    const gps = await exifr.gps(file);
    if (!gps || gps.latitude == null || gps.longitude == null) return null;
    return { latitude: gps.latitude, longitude: gps.longitude };
  } catch (err) {
    // EXIF may be missing or malformed — treat gracefully, not as an error
    if (import.meta.env.DEV) console.warn('[exifUtils] GPS extraction failed:', err);
    return null;
  }
}

/**
 * Format decimal GPS coordinates to a human-readable string.
 * @param {number} lat
 * @param {number} lng
 * @returns {string} e.g. "12.9716° N, 77.5946° E"
 */
export function formatCoordinates(lat, lng) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}
