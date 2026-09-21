import express from 'express';
import { getOAuth2Client } from '../config/googleClient.js';
import { google } from 'googleapis';

const router = express.Router();

/**
 * POST /api/auth/google
 *
 * Authorization-code exchange flow:
 *  1. Receive the one-time authorization code from the frontend.
 *  2. Exchange it for access + refresh tokens server-side.
 *  3. Fetch the user's profile from the Google People API.
 *  4. Return a session token (or the access token used as one here)
 *     along with safe profile data.
 *
 * The raw Google tokens are NEVER forwarded to the frontend.
 * The session token is the only credential the client receives.
 */
router.post('/google', async (req, res) => {
  const { code } = req.body ?? {};

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Authorization code is required.' });
  }

  try {
    const oauth2Client = getOAuth2Client();

    // Exchange the authorization code for Google tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      console.error('[auth] token exchange returned no access_token');
      return res.status(502).json({ error: 'Authentication failed. Please try again.' });
    }

    // Set credentials so we can call the People API
    oauth2Client.setCredentials(tokens);

    // Fetch user profile (name, email, picture) — minimum required fields
    const people = google.people({ version: 'v1', auth: oauth2Client });
    const { data: profile } = await people.people.get({
      resourceName: 'people/me',
      personFields: 'names,emailAddresses,photos',
    });

    const user = {
      name:    profile.names?.[0]?.displayName ?? 'Unknown',
      email:   profile.emailAddresses?.[0]?.value ?? '',
      picture: profile.photos?.[0]?.url ?? null,
    };

    // The session token is the access token — it allows the frontend to
    // make authenticated calls to our backend endpoints. The refresh token
    // and client secret never leave the server.
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
