import { google } from 'googleapis';

/**
 * googleClient.js — creates and caches the OAuth2 client singleton.
 *
 * Using a module-level singleton means we don't re-instantiate the client
 * on every request, which would be wasteful.
 *
 * Client secrets live entirely in environment variables — they are never
 * passed to or stored in the frontend.
 */

let _client = null;

/**
 * Return the shared OAuth2 client (lazily initialised).
 * Throws if any required env var is missing.
 */
export function getOAuth2Client() {
  if (_client) return _client;

  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error(
      'Missing required Google OAuth env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI'
    );
  }

  _client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  return _client;
}

/**
 * Clone the shared client and inject the provided tokens.
 * Each request gets its own credentials-scoped client instance.
 *
 * @param {{ access_token: string, refresh_token?: string }} tokens
 * @returns {import('googleapis').Auth.OAuth2Client}
 */
export function getAuthedClient(tokens) {
  const base = getOAuth2Client();
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  client.setCredentials(tokens);
  return client;
}
