/**
 * api.js — thin wrapper around fetch for all backend calls.
 *
 * Every function in the services/ layer uses this so that
 * auth headers, base URL, and error handling are centralised.
 */

const BASE_URL = import.meta.env?.VITE_BACKEND_URL ?? 'http://localhost:4000';

let unauthorizedHandler = null;

/**
 * Register a callback invoked whenever an API call encounters a 401 Unauthorized response.
 * @param {Function} handler
 */
export function setOnUnauthorized(handler) {
  unauthorizedHandler = handler;
}

/**
 * Trigger the registered 401 handler if present.
 */
export function notifyUnauthorized() {
  if (typeof unauthorizedHandler === 'function') {
    unauthorizedHandler();
  }
}

/**
 * Make an authenticated request to the backend.
 *
 * @param {string} path          - e.g. '/api/auth/google'
 * @param {RequestInit} options  - standard fetch options
 * @param {string|null} token    - session token from AuthContext
 * @returns {Promise<any>}       - parsed JSON body
 * @throws {Error}               - with a user-friendly message; technical detail is dev-logged
 */
export async function apiRequest(path, options = {}, token = null) {
  // Do NOT set Content-Type for FormData — the browser must set it with the
  // correct multipart boundary. For all other bodies default to JSON.
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // Caller-supplied headers override the defaults above
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch (networkErr) {
    if (import.meta.env?.DEV) console.error('[api] Network error:', networkErr);
    throw new Error('Network error — please check your connection and try again.');
  }

  if (!response.ok) {
    // 401 Unauthorized: token expired or invalid mid-session
    if (response.status === 401) {
      if (import.meta.env?.DEV) {
        console.warn(`[api] 401 Unauthorized on ${path}. Triggering session expiration.`);
      }
      notifyUnauthorized();
      const err = new Error('Your session has expired. Please sign in again.');
      err.status = 401;
      throw err;
    }

    // Log technical details in dev only; surface a friendly message to the caller.
    if (import.meta.env?.DEV) {
      const body = await response.text().catch(() => '');
      console.error(`[api] ${response.status} ${path}:`, body);
    }
    throw new Error(`Request failed (${response.status}). Please try again.`);
  }

  // 204 No Content — return null rather than trying to parse empty body
  if (response.status === 204) return null;

  return response.json();
}
