import { apiRequest } from './api';

/**
 * authService.js — OAuth code-exchange flow.
 *
 * The authorization code returned by Google Identity Services (GIS)
 * is sent to the backend, which exchanges it for tokens server-side.
 * The raw Google access/refresh tokens never touch the frontend.
 */

/**
 * Exchange a Google authorization code for a backend session token.
 *
 * @param {string} code - Authorization code from @react-oauth/google's useGoogleLogin
 * @returns {Promise<{ token: string, user: { name, email, picture } }>}
 */
export async function exchangeCodeForSession(code) {
  return apiRequest('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}
