import express from 'express';
import { google } from 'googleapis';
import { getOAuth2Client, getAuthedClient } from '../config/googleClient.js';

const router = express.Router();

/**
 * POST /api/auth/google
 *
 * Authorization-code exchange flow:
 *  1. Receive the one-time authorization code from the frontend.
 *  2. Exchange it for access + refresh tokens server-side using a fresh
 *     OAuth2Client (NOT the shared singleton, which could leak credentials
 *     across concurrent requests if setCredentials were called on it).
 *  3. Fetch the user's profile from the People API using a per-request client.
 *  4. Return only: a session token (the access_token) + safe profile data.
 *
 * The raw refresh token and client secret never leave the server.
 */
router.post('/google', async (req, res) => {
  const { code } = req.body ?? {};

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Authorization code is required.' });
  }

  try {
    // Use the shared client only to exchange the code — getToken returns
    // tokens without mutating the shared client's credential state.
    const sharedClient = getOAuth2Client();
    const { tokens } = await sharedClient.getToken(code);

    if (!tokens.access_token) {
      console.error('[auth] token exchange returned no access_token');
      return res.status(502).json({ error: 'Authentication failed. Please try again.' });
    }

    // Build a per-request authed client (never modifies the singleton)
    const authedClient = getAuthedClient({ access_token: tokens.access_token });

    // Fetch user profile with minimum required fields
    const people = google.people({ version: 'v1', auth: authedClient });
    const { data: profile } = await people.people.get({
      resourceName: 'people/me',
      personFields: 'names,emailAddresses,photos',
    });

    const user = {
      name:    profile.names?.[0]?.displayName ?? 'Unknown',
      email:   profile.emailAddresses?.[0]?.value ?? '',
      picture: profile.photos?.[0]?.url ?? null,
    };

    // Return the access token as the session token — it's what the backend
    // uses to authenticate all subsequent Drive/Sheets calls.
    // The refresh token and client secret stay server-side only.
    return res.json({
      token: tokens.access_token,
      user,
    });
  } catch (err) {
    console.error('[auth] code exchange failed:', err.message ?? err);
    return res.status(401).json({ error: 'Authentication failed. Please try again.' });
  }
});

export default router;
