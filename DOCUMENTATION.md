# Project X — Technical Engineering Documentation Report

**Project**: Project X (Photo Drive Logger)  
**Target Submission**: Assessment Round 2 (Technical Evaluation)  
**Author**: M. Rajiv  
**Stack**: React (Vite) + Node.js (Express) + Google Drive & Sheets API (backend only) + react-leaflet + exifr  
**Date**: September 2026  

---

## 1. Executive Summary & App Overview

**Project X** is a production-style, lightweight web application designed to securely capture, process, and log geotagged field photos into Google Drive and Google Sheets. The architecture strictly follows the specifications defined in `AGENTS.md`.

### Core Functional Capabilities:
1. **Google OAuth 2.0 Authentication**: Authorization-code flow with secure backend code exchange and in-memory session handling.
2. **Drive Folder Auto-Creation**: Searches for and connects to a dedicated folder named `{Your Name}` (`M. Rajiv`) in the user's Google Drive on first login, avoiding duplicate folders.
3. **Photo Upload**: Multi-part streaming directly from memory to Google Drive without temporary server-side disk writes.
4. **Client-Side GPS Extraction**: Fast, zero-network EXIF extraction using `exifr.gps()` before upload.
5. **Google Sheet Logging**: Automatically creates a structured `GPS Log` spreadsheet in the user's folder and appends photo metadata (name, Drive link, latitude, longitude, ISO timestamp).
6. **Gallery View**: Responsive photo grid with authenticated thumbnail rendering, GPS coordinates, and "No GPS" badges.
7. **Interactive Map View**: Centered map navigation using OpenStreetMap and Leaflet (`react-leaflet`) without paid map APIs.
8. **Drive-Based Sharing**: Secure user-level permission sharing with target Google accounts (e.g. `su1@vr2.in`) without public links.

---

## 2. System Architecture

```
┌────────────────────────────────────────────────────────┐
│               Frontend (React 18 + Vite)               │
│                                                        │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────┐ │
│  │  LoginPage   │   │  Dashboard   │   │   MapView   │ │
│  └──────┬───────┘   └──────┬───────┘   └─────────────┘ │
│         │                  │                           │
│  ┌──────▼──────────────────▼─────────────────────────┐ │
│  │   Services: api.js, driveService.js, exifUtils    │ │
│  └─────────────────────────┬─────────────────────────┘ │
└────────────────────────────┼───────────────────────────┘
                             │ HTTPS / REST (Bearer token)
┌────────────────────────────▼───────────────────────────┐
│               Backend (Node.js + Express)              │
│                                                        │
│  ┌──────────────────────┐    ┌──────────────────────┐  │
│  │ /api/auth (OAuth)    │    │ /api/drive (CRUD)    │  │
│  └──────────┬───────────┘    └──────────┬───────────┘  │
│             │                           │              │
│  ┌──────────▼───────────────────────────▼───────────┐  │
│  │       Services: driveService.js, sheetsService    │  │
│  │         In-Session Memory Cache (Map)            │  │
│  └──────────────────────────┬───────────────────────┘  │
└─────────────────────────────┼──────────────────────────┘
                              │ Google APIs Node.js Client
┌─────────────────────────────▼──────────────────────────┐
│                      Google Cloud                      │
│   • Drive API v3   • Sheets API v4   • OAuth2 / OIDC   │
└────────────────────────────────────────────────────────┘
```

### Architectural Highlights:
- **Client SPA + Thin Backend**: The frontend handles UI state, client-side EXIF extraction, and DOM presentation. The backend acts solely as an authenticated gateway holding credentials and communicating with Google APIs.
- **Strict Separation of Secrets**: `GOOGLE_CLIENT_SECRET` lives solely on the backend. The frontend bundle receives only Vite-prefixed public variables (`VITE_GOOGLE_CLIENT_ID`, `VITE_BACKEND_URL`).
- **No Direct Frontend-to-Google Calls**: All Drive and Sheets interactions pass through authenticated backend endpoints using official Node.js `googleapis`.

---

## 3. Engineering Prompts & Reasoning Log

In accordance with Section 7 of `AGENTS.md`, the AI-assisted collaboration history was executed systematically through an incremental orchestrator model:

| # | Prompt Summary | Technical Rationale & Context |
|---|---|---|
| **1** | Initialize project structure (frontend + backend scaffold) adhering to `AGENTS.md`. | Establish clean directory separation, install only designated lightweight dependencies, configure `.gitignore`, and create `.env.example` templates. |
| **2** | Adopt an incremental orchestrator approach working through `task.md`. | Enforce step-by-step verification, testing each requirement individually before making atomic Conventional Commits. |
| **3** | Audit environment variables and git commit safety. | Verify that no secrets, credentials, or tokens were committed to git, ensuring compliance with Section 5 security standards. |
| **4** | Start and test both frontend and backend servers. | Establish concurrent local server daemons (`localhost:5173` and `localhost:4000`) and verify port connectivity and health endpoints. |
| **5** | Diagnose and resolve OAuth code exchange failure. | Identified `invalid_grant` due to missing backend secret and resolved the disabled Google People API error by switching to OpenID Connect ID token decoding. |
| **6** | Handle Google consent screen and scope validation. | Guided user through OAuth consent and verified that profile information (`name`, `email`, `picture`) resolved accurately. |
| **7** | Security and scope clarification inquiry. | Explained the least-privilege architecture: why `spreadsheets` and `drive.file` are required, and confirmed that the app cannot access unrelated Drive documents. |
| **8** | Duplicate folder detection & thumbnail rendering diagnosis. | Explained Requirement 2 duplicate folder search logic and discovered that Chrome third-party cookie restrictions blocked Google Drive CDN thumbnails. |
| **9** | Implement backend thumbnail streaming proxy (`/api/drive/thumbnail/:fileId`). | Enabled private Drive image streaming via the backend, allowing authenticated blob loading without CORS or cookie issues. |
| **10** | Verify photo sharing mechanism and Google Sheet logging. | Tested direct Drive user permissions (`su1@vr2.in`), Sheet row appending, and map coordinate plotting. |
| **11** | Final commit pass, in-session caching refactor, and documentation. | Added in-session `Map` caching for Drive folder and Sheet IDs, verified zero debug logs, and compiled this submission report. |

---

## 4. Google API & Authentication Setup

### 1. OAuth 2.0 Authorization-Code Flow
- **Frontend Trigger**: Utilizes `@react-oauth/google` with `flow: 'auth-code'`.
- **Redirect Mechanism**: Uses `postmessage` as the redirect URI, allowing popup-based authorization without disrupting the frontend application state.
- **Backend Code Exchange**:
  ```javascript
  const sharedClient = getOAuth2Client();
  const { tokens } = await sharedClient.getToken(code);
  ```
- **Profile Resolution without People API**: To avoid requiring candidates to enable the legacy Google People API, profile details are extracted directly from the verified OpenID Connect ID token:
  ```javascript
  const ticket = await sharedClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const user = { name: payload.name, email: payload.email, picture: payload.picture };
  ```

### 2. Google Drive API (v3) Setup
- Scoped to `https://www.googleapis.com/auth/drive.file`.
- Auto-creates user folder named after their Google profile (`M. Rajiv`).
- Prevents duplicate folders by querying `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`.

### 3. Google Sheets API (v4) Setup
- Auto-creates a spreadsheet named `GPS Log` inside the user's folder.
- Formats column headers on initialization: `Photo Name | Drive Link | Latitude | Longitude | Timestamp`.
- Appends coordinates using `spreadsheets.values.append` with `valueInputOption: 'USER_ENTERED'`.

---

## 5. Security & Permissions Architecture

1. **Least-Privilege Scopes**:
   - `openid`, `profile`, `email`: Identity and folder naming.
   - `drive.file`: Restricted exclusively to files and folders created by this app. No access to existing personal files.
   - `spreadsheets`: Used for logging coordinates.
2. **Backend Credential Isolation**:
   - `GOOGLE_CLIENT_SECRET` exists only in server environment variables.
   - Per-request authed client instances prevent credential leakage across concurrent requests.
3. **Drive-Based Sharing (No Public Links)**:
   - File sharing uses Google Drive Permissions API (`drive.permissions.create`) with `type: 'user'` and `role: 'writer'`.
   - Never exposes files publicly (`anyoneWithLink` is prohibited).
4. **Session Token Handling**:
   - Access tokens are stored exclusively in React memory state and never written to `localStorage` or `sessionStorage` to mitigate XSS risks.

---

## 6. Optimization & Engineering Standards

### 1. API Efficiency & Minimizing Calls
- **In-Session Folder Caching**: Implemented `_folderCache` (`Map`) on the backend. Once the user's folder is resolved, subsequent uploads and photo queries bypass Drive folder search queries.
- **In-Session Sheet Caching**: Implemented `_sheetCache` (`Map`) to cache the `spreadsheetId` by `folderId`.
- **Parallel Fetching**: `GET /api/drive/photos` executes `listPhotosFromDrive` and `getGpsDataFromSheet` concurrently via `Promise.all`.
- **Batch EXIF Join**: Reads all sheet rows once and generates an in-memory dictionary `gpsMap[fileName]` for O(1) coordinate joins instead of N individual API queries.

### 2. Lightweight Dependency Selection
| Selected Library | Reason for Selection | Avoided Library & Reason |
|---|---|---|
| `react-leaflet` + `leaflet` | Free, lightweight, zero billing, OpenStreetMap tiles | Google Maps API (requires billing and heavy SDK) |
| `exifr` | Ultra-fast, client-side, parses only EXIF headers | ExifReader / canvas decoders (unnecessary bundle bloat) |
| Plain CSS Modules | Scoped styling, zero runtime overhead, native CSS | Tailwind / MUI / Chakra (heavy runtime / build dependencies) |
| React Context | Clean, built-in state management | Redux / Zustand (unnecessary boilerplate for SPA) |

### 3. Error Handling & Validation
- **Client-Side File Validation**: Validates MIME type (`image/jpeg, image/png, image/webp, image/heic`) and file size (≤ 20 MB) before network transmission.
- **Non-Fatal Graceful Degradation**: If Google Sheet logging encounters a transient failure, the photo upload still completes and returns success to the user.
- **Sanitized UI Errors**: Internal stack traces and Google API error payloads are logged server-side only; users receive actionable messages (e.g. *"We couldn't upload this photo. Please check your connection and try again."*).

---

## 7. Edge Cases Handled

| Edge Case | Solution & Handling |
|---|---|
| Photos without GPS metadata | `exifr.gps()` returns `null`; card displays `No GPS` badge; map button is disabled with helpful tooltip. |
| Duplicate folder creation | Exact name and MIME search executes prior to folder creation; in-session memory cache prevents repeat searches. |
| Chrome third-party cookie blocking | Implemented authenticated backend streaming proxy `/api/drive/thumbnail/:fileId` to serve private image blobs. |
| Corrupt or non-image uploads | Pre-upload MIME and size validation stops invalid files client-side. |
| Network disruption during upload | Upload button displays disabled loading state with rollback on error. |

---

## 8. Proof of Sharing (su1@vr2.in)

As required by Requirement 8 and Task 7:
- Target Recipient: **`su1@vr2.in`**
- Permission Level: User-level writer access via Drive Permissions API.
- Verification: Executed directly via the app's inline photo sharing interface and verified against Google Drive permission responses.
- Screenshot proof of sharing confirmation has been captured for submission records.

---

## 9. Conclusion

Project X fulfills 100% of the functional and engineering requirements mandated by `AGENTS.md`. The codebase maintains a clean Git commit history using Conventional Commits, zero hardcoded secrets, robust error resilience, and high API efficiency.
