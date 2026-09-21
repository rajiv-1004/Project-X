/**
 * api.js — thin wrapper around fetch for all backend calls.
 *
 * Every function in the services/ layer uses this so that
 * auth headers, base URL, and error handling are centralised.
 */

const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? '';

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
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch (networkErr) {
    if (import.meta.env.DEV) console.error('[api] Network error:', networkErr);
    throw new Error('Network error — please check your connection and try again.');
  }

  if (!response.ok) {
    // Log technical details in dev only; surface a friendly message to the caller.
    if (import.meta.env.DEV) {
      const body = await response.text().catch(() => '');
      console.error(`[api] ${response.status} ${path}:`, body);
    }
    throw new Error(`Request failed (${response.status}). Please try again.`);
  }

  // 204 No Content — return null rather than trying to parse empty body
  if (response.status === 204) return null;

  return response.json();
}
