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

    // Extract user profile from the verified ID token (no extra API call or People API required)
    let user = { name: 'Unknown', email: '', picture: null };

    if (tokens.id_token) {
      try {
        const ticket = await sharedClient.verifyIdToken({
          idToken: tokens.id_token,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (payload) {
          user = {
            name:    payload.name ?? 'Unknown',
            email:   payload.email ?? '',
            picture: payload.picture ?? null,
          };
        }
      } catch (verifyErr) {
        console.warn('[auth] id_token verification fallback:', verifyErr.message);
      }
    }

    // Fallback to standard OAuth2 userinfo if ID token lacked profile data
    if (!user.email) {
      const authedClient = getAuthedClient({ access_token: tokens.access_token });
      const oauth2 = google.oauth2({ version: 'v2', auth: authedClient });
      const { data: profile } = await oauth2.userinfo.get();
      user = {
        name:    profile.name ?? 'Unknown',
        email:   profile.email ?? '',
        picture: profile.picture ?? null,
      };
    }

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
