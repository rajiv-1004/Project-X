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

> **Note on the Sheet log view**: The app includes a "Google Sheet Log" sidebar view that renders the GPS data table from the Sheet created in Requirement 5 directly inside the dashboard. This is an added convenience view — not a separate graded requirement — providing quick in-app access to the same Sheet log data without leaving the interface.

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

## 6. Engineering Standards Compliance

This section provides concrete, verifiable evidence from the codebase demonstrating strict compliance with the core engineering standards mandated in `AGENTS.md` Section 4.

### 1. No Hardcoding
- **Zero Hardcoded Secrets or IDs**: No client IDs, client secrets, redirect URIs, spreadsheet IDs, folder IDs, or port numbers exist as hardcoded literals in source code.
  - Server config is completely driven by environment variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `PORT`) via `process.env` in [`backend/src/config/googleClient.js`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/backend/src/config/googleClient.js) lines 22–34.
  - Frontend config is driven by Vite environment variables (`VITE_GOOGLE_CLIENT_ID`, `VITE_BACKEND_URL`) in [`frontend/src/services/api.js`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/frontend/src/services/api.js) line 3.
- **Dynamic Folder Naming**: The user's Google Drive folder name is never hardcoded. It is resolved dynamically at runtime from the authenticated Google user profile (`data.name` in [`backend/src/services/driveService.js`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/backend/src/services/driveService.js) lines 32–37).
- **Literal Fallback String Justification**: The single literal string `'ProjectX-Photos'` in [`backend/src/services/driveService.js`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/backend/src/services/driveService.js) line 41 is a documented defensive fallback triggered *only* when Google's profile API returns an empty display name. Furthermore, lines 78–96 specifically contain migration logic to detect and rename any legacy `'ProjectX-Photos'` folder to the user's actual profile name, preventing duplicate folders and preserving existing files.

### 2. Lightweight Dependencies
The application eliminates all unnecessary dependencies, component libraries, and heavy SDKs. Both `package.json` files contain only the strictly necessary packages:

#### Frontend Dependencies (`frontend/package.json`)
- `@react-oauth/google` (`^0.12.1`): Official Google Identity Services SDK wrapper to implement authorization-code OAuth flow cleanly in React.
- `exifr` (`^7.1.3`): Lightweight, high-performance EXIF reader that parses only binary header segments directly in the browser (`exifr.gps()`) without decoding entire image bitmaps or loading canvas elements.
- `leaflet` (`^1.9.4`) & `react-leaflet` (`^4.2.1`): Zero-cost OpenStreetMap tile rendering. Avoids proprietary, billing-required SDKs like Google Maps.
- `react` (`^18.3.1`) & `react-dom` (`^18.3.1`): Core React SPA library.
- *Styling*: 100% plain CSS Modules — zero UI component libraries (no MUI, Chakra, or Ant) and no heavy utility runtimes.
- *State Management*: Pure React Hooks and Context (`AuthContext.jsx`) — no Redux or external state stores.

#### Backend Dependencies (`backend/package.json`)
- `express` (`^4.19.2`): Minimalist Node.js HTTP framework acting as a lightweight gateway to hold secrets server-side.
- `cors` (`^2.8.5`): Manages CORS headers between localhost:5173 and localhost:4000.
- `dotenv` (`^16.4.5`): Parses local `.env` files into `process.env`.
- `googleapis` (`^140.0.1`): Official Google client for OAuth2 token exchange, Drive v3 API, and Sheets v4 API calls.
- `multer` (`^2.4.0`): Handles in-memory multipart buffer streams directly to Google Drive without touching local disk.
- *Audited & Removed*: `axios` was audited, verified as completely unused, and uninstalled (`npm uninstall axios`).

### 3. Production-Style Architecture
The codebase enforces clear separation of concerns across dedicated architectural layers:
- `backend/src/config/`: [`googleClient.js`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/backend/src/config/googleClient.js) encapsulates OAuth2 client instantiation and token injection.
- `backend/src/routes/`: Route handlers ([`auth.js`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/backend/src/routes/auth.js), [`drive.js`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/backend/src/routes/drive.js)) only parse requests, invoke services, and return standard JSON HTTP responses.
- `backend/src/services/`: Pure business and API logic ([`driveService.js`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/backend/src/services/driveService.js), [`sheetsService.js`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/backend/src/services/sheetsService.js)) containing folder deduplication, streaming upload, sheet row appending, and in-session caching.
- `frontend/src/context/`: [`AuthContext.jsx`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/frontend/src/context/AuthContext.jsx) encapsulates user session and in-memory token state.
- `frontend/src/services/`: Network clients ([`api.js`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/frontend/src/services/api.js), [`driveService.js`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/frontend/src/services/driveService.js)) separating HTTP communication from UI components.
- `frontend/src/utils/`: Pure helper functions ([`fileUtils.js`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/frontend/src/utils/fileUtils.js), [`exifUtils.js`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/frontend/src/utils/exifUtils.js)).
- `frontend/src/components/`: Reusable presentation components ([`Gallery.jsx`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/frontend/src/components/Gallery.jsx), [`PhotoCard.jsx`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/frontend/src/components/PhotoCard.jsx), [`UploadButton.jsx`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/frontend/src/components/UploadButton.jsx), [`MapView.jsx`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/frontend/src/components/MapView.jsx)).
- `frontend/src/pages/`: Page orchestrators ([`LoginPage.jsx`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/frontend/src/pages/LoginPage.jsx), [`Dashboard.jsx`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/frontend/src/pages/Dashboard.jsx)).

### 4. Validation
- **Client-Side File Validation** ([`frontend/src/utils/fileUtils.js`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/frontend/src/utils/fileUtils.js) lines 10–26):
  - Checks for null/missing file.
  - Enforces allowed MIME types (`image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`).
  - Enforces max size limit (20 MB). Rejects invalid files immediately before network transfer begins.
- **Client-Side GPS EXIF Validation & Confirmation Step** ([`frontend/src/components/UploadButton.jsx`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/frontend/src/components/UploadButton.jsx), [`GpsWarningModal.jsx`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/frontend/src/components/GpsWarningModal.jsx)):
  - Evaluates GPS coordinates client-side prior to network dispatch.
  - If GPS coordinates are missing, pauses the upload and presents an accessible modal (`GpsWarningModal`) with helpful camera geotagging recommendations.
  - Provides two distinct user actions: "Cancel" (aborts with zero network calls) or "Upload anyway" (proceeds with upload, logging empty GPS fields in Sheets).
- **Server-Side File Type & Size Re-Validation** ([`backend/src/routes/drive.js`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/backend/src/routes/drive.js) lines 20–56 & 120–135):
  - Does not rely on frontend validation alone; protects against direct API bypasses.
  - Multer middleware wrapper catches oversized files (`LIMIT_FILE_SIZE`) and unauthorized file types (`INVALID_MIME_TYPE`).
  - Route handler explicitly re-validates `ALLOWED_MIME_TYPES` and `MAX_FILE_SIZE_BYTES`, returning standardized HTTP 400 Bad Request responses matching the friendly frontend error pattern (`'Unsupported file type. Please upload a JPEG, PNG, WebP, or HEIC image.'` and `'File is too large. Maximum allowed size is 20 MB.'`).
- **Sharing Email Validation**:
  - Client-side: [`ShareModal.jsx`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/frontend/src/components/ShareModal.jsx) uses HTML5 input type `email`, required attribute, and `email.trim()`.
  - Server-side: [`backend/src/routes/drive.js`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/backend/src/routes/drive.js) explicitly validates `!emailAddress || typeof emailAddress !== 'string' || !emailAddress.includes('@')`, returning HTTP 400 (`'A valid email address is required.'`).

### 5. Error Handling & Information Hiding
- **Try/Catch on Every Route**: All asynchronous route handlers in `backend/src/routes/auth.js` and `backend/src/routes/drive.js` wrap Google API invocations in `try/catch` blocks.
- **Mid-Session 401 Expiration Detection & Seamless Login Return**:
  - Centralized in [`frontend/src/services/api.js`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/frontend/src/services/api.js) via `setOnUnauthorized()`.
  - When an access token expires or is rejected with HTTP 401 during an active session, the app immediately intercepts the response, notifies [`AuthContext.jsx`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/frontend/src/context/AuthContext.jsx), clears the in-memory token, and cleanly returns the user to [`LoginPage.jsx`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/frontend/src/pages/LoginPage.jsx) with a distinct, user-friendly notice: *"Your session has expired. Please sign in again."* rather than stranding the user on a broken dashboard with vague errors.
- **Strict Information Hiding**: Technical details, stack traces, and Google API error objects are logged to server console only (`console.error`). Clients receive safe, friendly messages:
  - Auth failure: `"Authentication failed. Please try again."`
  - Upload failure: `"We couldn't upload this photo. Please try again."`
  - Drive access failure: `"Could not access your Drive folder."`
  - Share failure: `"Sharing failed. Please check the email and try again."`
- **Global Fallback Error Handler**: [`backend/src/index.js`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/backend/src/index.js) lines 28–34 catches any unhandled exceptions as a final safety net:
  ```javascript
  // ─── Error handler ────────────────────────────────────────────────────────────
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    // Log technical details server-side only — never sent to client
    console.error('[server] unhandled error:', err.message ?? err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  });
  ```

### 6. Clean Code
- **Zero Leftover Debugging Logs**: A global codebase audit confirmed no temporary debug `console.log()` calls remain. Only one intentional server startup log exists in [`backend/src/index.js`](file:///c:/Users/91637/Downloads/project%20X%20%28final%20version%29/backend/src/index.js) line 37 (`[server] listening on http://localhost:${PORT}`).
- **High-Value Comments**: Comments in the codebase focus strictly on architectural rationale, security guarantees, and edge-case handling rather than restating code:
  - In `googleClient.js`: explains why per-request client instances prevent credential race conditions across concurrent requests.
  - In `driveService.js`: documents why duplicate checking uses exact name and MIME filters before creation.
  - In `PhotoCard.jsx`: documents authenticated blob URL loading and `URL.revokeObjectURL()` memory cleanup.

### 7. Security & Privacy Standards (in-code enforcement)
- **No Hardcoding**: No user IDs, folder IDs, spreadsheet IDs, or tokens are hardcoded anywhere in the codebase. All resource IDs are resolved at runtime through the Google API and cached in server-side session memory.
- **Client-Side EXIF Extraction**: GPS coordinates are extracted in-browser via `exifr.gps()` — no image bytes leave the device until the user explicitly approves the upload. This minimises both bandwidth and server processing.
- **User-Level Sharing Only**: Drive permissions are granted directly per Google account (`type: 'user'`, `role: 'writer'`). The `anyoneWithLink` sharing type is explicitly prohibited and never used.
- **No Disk Footprint**: `multer` is configured with `memoryStorage()` — uploaded file buffers stream directly from client to Google Drive without ever being written to the server's local filesystem.

---

## 7. Optimization & API Efficiency

### 1. Minimizing Calls
- **In-Session Folder Caching**: Implemented `_folderCache` (`Map`) on the backend. Once the user's folder is resolved, subsequent uploads and photo queries bypass Drive folder search queries.
- **In-Session Sheet Caching**: Implemented `_sheetCache` (`Map`) to cache the `spreadsheetId` by `folderId`.
- **Parallel Fetching**: `GET /api/drive/photos` executes `listPhotosFromDrive` and `getGpsDataFromSheet` concurrently via `Promise.all`.
- **Batch EXIF Join**: Reads all sheet rows once and generates an in-memory dictionary `gpsMap[fileName]` for O(1) coordinate joins instead of N individual API queries.

---

## 8. Edge Cases Handled

| Edge Case | Solution & Handling |
|---|---|
| Photos without GPS metadata | `exifr.gps()` returns `null`; card displays `No GPS` badge; map button is disabled with helpful tooltip. |
| Duplicate folder creation | Exact name and MIME search executes prior to folder creation; in-session memory cache prevents repeat searches. |
| Chrome third-party cookie blocking | Implemented authenticated backend streaming proxy `/api/drive/thumbnail/:fileId` to serve private image blobs. |
| Corrupt or non-image uploads | Pre-upload MIME and size validation stops invalid files client-side. |
| Network disruption during upload | Upload button displays disabled loading state with rollback on error. |

---

## 9. Challenges Faced & Trade-offs Made

### Challenge: Private Drive Thumbnail Loading Across Origins & Cookie Partitioning
- **The Problem**: Google Drive's API returns direct `thumbnailLink` CDN URLs (`https://lh3.googleusercontent.com/u/0/d/...`). When the application is served on a different origin (e.g. `http://localhost:5173`), modern browsers (Chrome 115+, Safari) enforce strict third-party cookie partitioning and cross-origin isolation. Consequently, unauthenticated HTTP image requests initiated by standard `<img src="...">` tags fail with `403 Forbidden` or load broken placeholder icons, because Google's CDN cannot access the user's ambient session cookies.
- **The Solution**: Rather than attempting to make files publicly accessible (which strictly violates our security standard: *"No file is ever made publicly accessible"*), we implemented an authenticated backend image streaming proxy at `GET /api/drive/thumbnail/:fileId`. The Express backend utilizes the user's Bearer access token to fetch the raw image stream from `drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' })` and pipes it directly to the browser. On the frontend, `PhotoCard.jsx` invokes `fetchThumbnailBlob()` to retrieve the binary payload as a Blob and binds it via `URL.createObjectURL()`.
- **The Trade-Off (Latency vs. Reliability)**:
  - Streaming through the backend introduces a real network round-trip for every photo: `Browser -> Backend -> Google Drive API -> Backend -> Browser`.
  - On the first gallery load, fetching each thumbnail independently adds visible latency (typically 1–3 seconds for multiple photos) compared to direct edge-cached CDN links.
- **Mitigation in Place**:
  - The backend thumbnail endpoint sets strict HTTP caching headers: `Cache-Control: private, max-age=3600`.
  - Once loaded, repeat views or re-renders within the same browser session load instantly from the browser's disk/memory cache rather than re-fetching from Google Drive.
  - To prevent client memory leaks, `PhotoCard.jsx` cleans up allocated object URLs on component unmount via `URL.revokeObjectURL(blobUrl)`.
- **Engineering Rationale**: Reliability across all browsers and platforms was decisively prioritized over raw initial load speed. An image thumbnail that takes 1–2 seconds to render reliably is vastly superior to broken image error icons, and fully preserves the zero-public-access security model.

---

## 10. Proof of Sharing (su1@vr2.in)

As required by Requirement 8 and Task 7:
- Target Recipient: **`su1@vr2.in`**
- Permission Level: User-level writer access via Drive Permissions API.
- Verification: Executed directly via the app's inline photo sharing interface and verified against Google Drive permission responses.
- Screenshot proof of sharing confirmation has been captured for submission records.

---

## 11. Conclusion

Project X fulfills 100% of the functional and engineering requirements mandated by `AGENTS.md`. The codebase maintains a clean Git commit history using Conventional Commits, zero hardcoded secrets, robust error resilience, and high API efficiency.
