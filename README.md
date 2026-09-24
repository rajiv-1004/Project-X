# Project X — Geospatial Field Photo & Document Intelligence Suite

A full-stack web application designed for field documentation, surveying, and geospatial asset inspection. Authenticated users can sign in with their Google account, capture or upload field photographs, automatically extract GPS coordinates directly from photo EXIF metadata, store images securely in a dedicated Google Drive folder, maintain a structured real-time GPS log in Google Sheets, browse photos in an interactive library, explore locations on a Leaflet OpenStreetMap, and share records with other Google accounts using Google Drive user permissions.

---

## Table of Contents

1. [Features](#features)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Prerequisites](#prerequisites)
5. [Google Cloud Setup](#google-cloud-setup)
6. [Google OAuth Test Users](#google-oauth-test-users)
7. [Environment Configuration](#environment-configuration)
8. [Local Installation](#local-installation)
9. [Running the Application](#running-the-application)
10. [First Run Checklist](#first-run-checklist)
11. [GPS EXIF Processing & Fallback Flow](#gps-exif-processing--fallback-flow)
12. [Supported File Types & Constraints](#supported-file-types--constraints)
13. [Google Drive Behavior](#google-drive-behavior)
14. [Google Sheets Behavior](#google-sheets-behavior)
15. [Troubleshooting Guide](#troubleshooting-guide)
16. [Security Considerations](#security-considerations)
17. [Project Structure](#project-structure)
18. [Development Commands](#development-commands)
19. [Testing & Verification](#testing--verification)

---

## Features

| Feature | Description |
|---|---|
| **Google Authentication** | Secure OAuth 2.0 authorization-code flow using `@react-oauth/google`. The client secret is stored strictly server-side. |
| **User-Dedicated Drive Folder** | On first sign-in, creates a folder named after the user (`{User's Google Name}`) in their Drive root. Idempotently searches before creating to prevent duplicate folders. |
| **Photo Upload & Drag-and-Drop** | Upload field photos and documents directly via file picker, drag-and-drop surface, or mobile device camera. |
| **Camera Capture** | Native device camera capture (`capture="environment"`) supported on mobile phones and tablets. |
| **Client-Side EXIF GPS** | Extracts latitude and longitude directly in the browser via `exifr` before upload, saving bandwidth and server compute. |
| **Missing GPS Warning Dialog** | If an image lacks GPS metadata, a modal dialog alerts the user and offers the choice to cancel or upload anyway with coordinates recorded as null. |
| **Google Sheets GPS Log** | Maintains a dedicated `GPS Log` spreadsheet inside the user's folder. Logs photo name, Drive web link, latitude, longitude, and ISO timestamp. Auto-created idempotently. |
| **Interactive Photo Library** | Browse uploaded photos with coordinates, search by filename, filter by GPS Tagged / No GPS, and sort by newest, oldest, or filename. |
| **Geospatial Map View** | Visualizes all GPS-tagged field photos on an interactive OpenStreetMap via `react-leaflet`. Includes photo popup pins and coordinate copying. |
| **Authenticated Thumbnail Proxy** | Backend endpoint (`/api/drive/thumbnail/:fileId`) streams private photo thumbnails securely, preventing third-party cookie blocking issues with Google CDN. |
| **Drive Permission Sharing** | Share individual photos with any Google account (e.g. `su1@vr2.in`) with `reader` or `writer` access via Google Drive user permissions (no public links). |

---

## Technology Stack

### Frontend
- **Framework**: [React 18](https://react.dev/) (`^18.3.1`) + [React DOM](https://www.npmjs.com/package/react-dom) (`^18.3.1`)
- **Build Tool & Dev Server**: [Vite 5](https://vitejs.dev/) (`^5.3.4`)
- **Authentication**: [`@react-oauth/google`](https://www.npmjs.com/package/@react-oauth/google) (`^0.12.1`) — Google Identity Services authorization-code flow
- **EXIF / GPS Extraction**: [`exifr`](https://www.npmjs.com/package/exifr) (`^7.1.3`) — client-side binary EXIF parser
- **Geospatial Mapping**: [`leaflet`](https://www.npmjs.com/package/leaflet) (`^1.9.4`) & [`react-leaflet`](https://www.npmjs.com/package/react-leaflet) (`^4.2.1`)
- **Tiles**: OpenStreetMap standard tile layer (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`)
- **Styling**: Pure CSS Modules (`.module.css`) with custom CSS custom properties — no heavy component libraries (zero Tailwind / MUI / Bootstrap)
- **State Management**: Built-in React Context (`AuthContext`) and React hooks

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (`>= 18.11.0` or `20.x` LTS recommended)
- **Framework**: [Express 4](https://expressjs.com/) (`^4.19.2`)
- **Google Client**: [`googleapis`](https://www.npmjs.com/package/googleapis) (`^140.0.1`) — official Google Node.js client (Drive v3, Sheets v4, OAuth2 v2)
- **Multipart Uploads**: [`multer`](https://www.npmjs.com/package/multer) (`^2.4.0`) — memory storage with 20 MB size limits
- **CORS**: [`cors`](https://www.npmjs.com/package/cors) (`^2.8.5`)
- **Configuration**: [`dotenv`](https://www.npmjs.com/package/dotenv) (`^16.4.5`)

### Google Cloud APIs
- **Google Drive API v3**: For creating user folders, uploading files, listing photos, streaming thumbnails, and managing sharing permissions.
- **Google Sheets API v4**: For creating the `GPS Log` spreadsheet, appending GPS entries, and reading GPS log rows.
- **Google OAuth2 / OpenID Connect**: For token exchange and extracting the user's profile name, email, and picture.
> **Note**: The People API is **not** required. User profile information is retrieved from the verified OpenID Connect ID token and the Google OAuth2 userinfo endpoint.

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│               Client Browser (SPA)                     │
│  React 18 + Vite (http://localhost:5173)               │
│  - User triggers Google Login popup                    │
│  - Extracts EXIF GPS client-side via exifr             │
│  - Renders interactive map using Leaflet (OSM tiles)   │
│  - Holds access_token in React memory state (Auth)     │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / JSON / Multipart
                           │ Authorization: Bearer <token>
┌──────────────────────────▼─────────────────────────────┐
│                 Node.js + Express API                  │
│             (http://localhost:4000)                    │
│  - Holds GOOGLE_CLIENT_SECRET securely                 │
│  - Exposes /api/auth/google (authorization-code swap)  │
│  - Manages Google Drive & Sheets server-side           │
│  - Authenticated thumbnail streaming proxy             │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
┌─────────────▼─────────────┐┌─────────────▼─────────────┐
│    Google Drive API v3    ││   Google Sheets API v4    │
│  - '{User Name}' folder   ││  - 'GPS Log' spreadsheet  │
│  - Photo storage          ││  - Append GPS entries     │
│  - Permission sharing     ││  - Read GPS coordinates   │
└───────────────────────────┘└───────────────────────────┘
```

### Layer Responsibilities
1. **Frontend**:
   - Handles presentation, responsive layouts, search, sorting, and map visualizations.
   - Parses EXIF metadata directly from the user's uploaded `File` in browser memory before network transmission.
   - Stores session tokens strictly in React state (`AuthContext`) in memory. Tokens are automatically cleared on tab close or page reload.
   - Never has access to `GOOGLE_CLIENT_SECRET`.

2. **Backend**:
   - Thin proxy and secrets container.
   - Validates all incoming requests via `requireAuth` middleware by extracting the Bearer token.
   - Exchanges Google authorization codes for OAuth tokens server-side.
   - Handles all Google Drive and Sheets API calls server-side with structured error handling so user-friendly messages are returned rather than raw error dumps.

---

## Prerequisites

Ensure your system meets the following requirements:

- **Git**: Installed and available in your terminal (`git --version`)
- **Node.js**: **v18.11.0 or newer** (Node.js 20.x LTS or 22.x recommended). Tested on Node v20 / v24.
- **npm**: **v9.0.0 or newer** (comes bundled with Node.js)
- **Google Account**: A regular Google account (`@gmail.com` or Google Workspace)
- **Google Cloud Project**: A GCP project with OAuth credentials (see setup below)
- **Modern Web Browser**: Google Chrome, Mozilla Firefox, Microsoft Edge, or Safari with JavaScript enabled

> **Note on Python**: **Python is not required to run Project X.** The entire codebase is implemented in modern JavaScript (ES Modules) running on Node.js and the browser.

---

## Google Cloud Setup

Follow these steps in the Google Cloud Console to set up your OAuth credentials.

### Step 1 — Create a Google Cloud Project
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown in the top navigation bar and click **New Project**.
3. Name your project (e.g. `Project-X-FieldApp`) and click **Create**.
4. Select the newly created project from the top dropdown.

### Step 2 — Enable Required APIs
Enable the two Google APIs used by Project X:
1. In the left navigation, go to **APIs & Services** > **Library**.
2. Search for **Google Drive API** and click **Enable**.
3. Return to the Library, search for **Google Sheets API**, and click **Enable**.

### Step 3 — Configure OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen** (or **Google Auth Platform**).
2. Select **External** user type and click **Create**.
3. Fill in the required fields:
   - **App name**: `Project X`
   - **User support email**: Select your email address.
   - **Developer contact email**: Enter your email address.
4. Click **Save and Continue**.
5. On the **Scopes** page, click **Add or Remove Scopes**. Select:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
   - Manually add:
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/spreadsheets`
6. Click **Update** and then **Save and Continue**.
7. On the **Test users** page, click **Add Users** and add your Google email address (and any evaluation accounts, e.g. `su1@vr2.in`). Click **Save and Continue**.

### Step 4 — Create OAuth 2.0 Client Credentials
1. Go to **APIs & Services** > **Credentials**.
2. Click **+ Create Credentials** > **OAuth client ID**.
3. Set **Application type** to **Web application**.
4. Set **Name** to `Project X Web Client`.
5. Under **Authorized JavaScript origins**, click **+ Add URI** and enter:
   ```text
   http://localhost:5173
   ```
6. Under **Authorized redirect URIs**, click **+ Add URI** and enter:
   ```text
   postmessage
   ```
   > **Important**: Project X uses the `@react-oauth/google` popup authorization-code flow. In Google's JavaScript authorization code exchange, `postmessage` is the exact redirect URI required by Google Identity Services to communicate the authorization code back to the client window.
7. Click **Create**.
8. Copy your **Client ID** and **Client Secret**.

### Step 5 — Required OAuth Scopes Explained

| Scope | Purpose in Project X |
|---|---|
| `openid` | Verifies the user's Google digital identity. |
| `profile` | Retrieves display name and avatar to personalize the interface and name the Drive folder (`{User Name}`). |
| `email` | Displays user identity and allows confirmation of permissions. |
| `https://www.googleapis.com/auth/drive.file` | **Least-privilege storage access.** Grants permission to create and manage *only* the specific files and folders created by Project X. The application cannot access, read, or modify any unrelated files in the user's Drive. |
| `https://www.googleapis.com/auth/spreadsheets` | Grants permission to create the `GPS Log` sheet and append photo coordinates and timestamps. |

---

## Google OAuth Test Users

While your Google Cloud project is in **Testing** status (the standard development mode), Google restricts OAuth access exclusively to registered test users:

1. In the Google Cloud Console, navigate to **APIs & Services** > **OAuth consent screen** > **Test users**.
2. Ensure your personal email address is listed.
3. If an evaluator or colleague needs to log in, add their email address (e.g. `su1@vr2.in`) to the test users list and save.
4. Users not listed in the test users list will receive Google Error `403: access_denied` during login. This is standard Google security policy for unverified development apps, not an application bug.

---

## Environment Configuration

Configuration values and secrets must never be hardcoded into source code. Project X uses separate `.env` files for the backend and frontend.

### Backend (`backend/.env`)

Create `backend/.env` with the following variables:

```env
# Google OAuth Client ID (must match frontend)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Google OAuth Client Secret (NEVER expose to frontend)
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret

# Redirect URI for @react-oauth/google code flow
GOOGLE_REDIRECT_URI=postmessage

# Port the Express server listens on
PORT=4000
```

### Frontend (`frontend/.env`)

Create `frontend/.env` with the following variables:

```env
# Google OAuth Client ID (publicly exposed to Vite bundle)
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Base URL of the Express backend (no trailing slash)
VITE_BACKEND_URL=http://localhost:4000
```

> **Security Reminder**:
> - Real `.env` files are ignored by git (`.gitignore`).
> - The Google Client Secret must **only** appear in `backend/.env`. It must **never** be added to `frontend/.env` or prefixed with `VITE_`.

---

## Local Installation

### 1. Clone the repository
```bash
git clone https://github.com/rajiv-1004/Project-X.git
cd Project-X
```

### 2. Configure Backend
```bash
cd backend
cp .env.example .env
```
Open `backend/.env` and insert your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

Install backend dependencies:
```bash
npm install
```

### 3. Configure Frontend
```bash
cd ../frontend
cp .env.example .env
```
Open `frontend/.env` and insert your `VITE_GOOGLE_CLIENT_ID` and `VITE_BACKEND_URL=http://localhost:4000`.

Install frontend dependencies:
```bash
npm install
```

---

## Running the Application

Both the backend and frontend servers must be running concurrently. Open two separate terminal windows:

### Terminal 1 — Backend API
```bash
cd backend
npm run dev
```
*The backend starts at `http://localhost:4000` with file-watch enabled (`node --watch src/index.js`).*

### Terminal 2 — Frontend Application
```bash
cd frontend
npm run dev
```
*The Vite development server starts at `http://localhost:5173`.*

Open your web browser and navigate to:
```text
http://localhost:5173
```

---

## First Run Checklist

Follow this checklist to verify that all systems are operational:

- [ ] **Backend Health Check**: Open `http://localhost:4000/api/health` in your browser. It should return `{"ok":true}`.
- [ ] **Frontend Load**: Navigate to `http://localhost:5173`. You should see the Project X Sign-In page.
- [ ] **Google Sign-In**: Click **Sign in with Google**. Authenticate in the Google popup and approve the requested Drive & Sheets permissions.
- [ ] **Workspace Creation**: On your first login, check your Google Drive. A new folder named after your Google display name (e.g. `John Doe`) should be present.
- [ ] **Upload GPS-Tagged Photo**: Click **Upload Photo** or drag an image containing EXIF GPS metadata.
- [ ] **Verify EXIF Detection**: The upload card should show **GPS Detected** with coordinates before syncing.
- [ ] **Verify Drive Storage**: Open your Google Drive folder. Confirm the photo file is present.
- [ ] **Verify Sheet Logging**: Check your Google Drive folder for a spreadsheet named `GPS Log`. Confirm it contains a row with your photo name, Drive web link, latitude, longitude, and timestamp.
- [ ] **Photos Tab**: Navigate to **Photos**. Confirm the photo card shows with thumbnail, filename, and coordinate badges.
- [ ] **Map Tab**: Navigate to **Map**. Confirm an OpenStreetMap pin marker displays at the photo's location.
- [ ] **Share Feature**: Click the share icon on the photo card, enter an email (e.g. `su1@vr2.in`), select **Editor** or **Viewer**, and confirm sharing.

---

## GPS EXIF Processing & Fallback Flow

Project X processes GPS metadata using a privacy-first, client-side approach:

```
[User Selects File]
        │
        ▼
[Client-side validation (MIME + Size)]
        │
        ▼
[exifr.gps(file) client-side extraction]
        │
   GPS Found?
   ├── YES ──► Automatically uploads photo with { lat, lng } to backend
   │           Backend saves file to Drive and appends row with coords to Sheet
   │
   └── NO ───► Triggers GpsWarningModal dialog in UI:
               ├── [Cancel] ──► Upload aborted; inputs reset; nothing stored
               └── [Upload anyway] ──► Uploads photo with null coords
                                       Saved to Drive; Sheet row logged with blank GPS
```

- **When GPS coordinates exist**: Decimal coordinates (e.g. `12.9716, 77.5946`) are extracted, formatted into human-readable strings (`12.9716° N, 77.5946° E`), displayed in the library, and mapped in the Map View.
- **When GPS is missing**: The user is shown a confirmation modal explaining that the photo contains no location metadata. The user can either cancel or choose "Upload anyway". If uploaded, the photo is stored in Drive, the Sheet row receives empty strings for Latitude/Longitude, and the photo is tagged with a "No GPS Metadata" badge in the UI.

---

## Supported File Types & Constraints

Both the frontend (`fileUtils.js`) and backend (`multer` middleware in `drive.js`) enforce matching constraints:

- **Supported MIME Types**:
  - `image/jpeg` (`.jpg`, `.jpeg`)
  - `image/png` (`.png`)
  - `image/webp` (`.webp`)
  - `image/heic` (`.heic`)
  - `image/heif` (`.heif`)
- **Maximum File Size**: `20 MB` (enforced client-side before reading and server-side in `multer`)
- **Camera Capture**: Supported on mobile devices using HTML5 file input with `capture="environment"`.

---

## Google Drive Behavior

- **Folder Naming**: The folder is named after the authenticated user's Google display name (e.g. `M. Rajiv`).
- **Duplicate Prevention**: Before creating a folder, the backend queries:
  ```text
  mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false
  ```
  If a folder with that name exists, its ID is reused. An in-session memory cache prevents redundant Drive search calls during the same session.
- **File Upload**: Photos are streamed directly to Google Drive via `drive.files.create`. Memory buffers are cleared immediately after upload.
- **Privacy by Default**: Files uploaded to Drive are private to the user account by default.
- **Thumbnail Streaming Proxy**: Google Drive CDN thumbnails frequently fail to load in modern browsers due to third-party cookie restrictions. Project X solves this with `GET /api/drive/thumbnail/:fileId`, which streams the thumbnail directly through the authenticated backend with HTTP cache headers.
- **Sharing**: When sharing a photo, the backend calls `drive.permissions.create` with `type: 'user'`, `role: 'writer'` or `'reader'`, and the recipient's Google email address. **No public link is ever generated.**

---

## Google Sheets Behavior

- **Spreadsheet Name**: `GPS Log`
- **Location**: Created directly inside the user's dedicated Google Drive folder (`parents: [folderId]`).
- **Duplicate Prevention**: Searches for an existing `application/vnd.google-apps.spreadsheet` named `GPS Log` inside the folder before creating.
- **Structure**:
  - Tab: First sheet (default)
  - Columns:
    - **A**: `Photo Name`
    - **B**: `Drive Link` (clickable web view link)
    - **C**: `Latitude` (decimal or blank)
    - **D**: `Longitude` (decimal or blank)
    - **E**: `Timestamp` (ISO 8601 string)
- **Appends**: Each new photo upload appends a single row using `spreadsheets.values.append` (`USER_ENTERED`).
- **Sheet Viewer**: Users can view the live tabular log directly within the app under the **GPS Log** tab, or click the direct Google Sheets shortcut to open it in Google Drive.

---

## Troubleshooting Guide

### 1. Google Sign-In Fails or Closes Immediately
- **Check Authorized JavaScript Origins**: Ensure `http://localhost:5173` (no trailing slash) is added to Authorized JavaScript origins in the Google Cloud Console.
- **Check Authorized Redirect URIs**: Ensure `postmessage` is explicitly added under Authorized redirect URIs.
- **Check Client ID**: Confirm that `VITE_GOOGLE_CLIENT_ID` in `frontend/.env` matches `GOOGLE_CLIENT_ID` in `backend/.env`.

### 2. Google Error 403: `access_denied` / App not verified
- **Cause**: The GCP project is in **Testing** status and the Google account attempting to log in is not listed as a Test User.
- **Fix**: In Google Cloud Console, navigate to **APIs & Services** > **OAuth consent screen** > **Test users**, click **+ Add Users**, enter the email address, and save.

### 3. Backend Error: `listen EADDRINUSE: address already in use :::4000`
- **Cause**: Another process or background instance of the backend is already occupying port 4000.
- **Fix (Windows Powershell)**:
  ```powershell
  Stop-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess -Force
  ```
- **Fix (macOS / Linux)**:
  ```bash
  kill -9 $(lsof -t -i:4000)
  ```

### 4. Drive or Sheets API Error: 403 / 502 Bad Gateway
- **Cause**: Required Google APIs are not enabled in the GCP Console.
- **Fix**: Go to Google Cloud Console > **APIs & Services** > **Library**, and ensure both **Google Drive API** and **Google Sheets API** are enabled.

### 5. GPS Metadata Not Detected
- **Cause**: Many photos taken on desktops, downloaded from messaging apps (e.g. WhatsApp, Slack), or stripped for web privacy contain no EXIF GPS tags.
- **Fix**: Use an original photo captured on a smartphone with location services/geotagging enabled in the camera settings, or test with sample geotagged images.

---

## Security Considerations

1. **Token Storage**: OAuth access tokens are stored in-memory in React state (`AuthContext`). They are never persisted to `localStorage` or `sessionStorage` to mitigate XSS exposure.
2. **Backend Secret Isolation**: `GOOGLE_CLIENT_SECRET` lives solely in `backend/.env` and is never exposed in client bundles or network responses.
3. **Least-Privilege Scopes**: Project X requests `drive.file` rather than full `drive` scope, ensuring the application cannot access or modify unrelated personal Drive files.
4. **No Public Links**: Photo sharing uses explicit Google Drive user-level permissions (`type: 'user'`), keeping assets private to authorized accounts.
5. **Sanitized User Errors**: Raw API exceptions, Google error stack traces, and system file paths are logged server-side only. The frontend renders friendly, actionable messages.

---

## Project Structure

```text
Project-X/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── googleClient.js      # OAuth2 client singleton & token injector
│   │   ├── routes/
│   │   │   ├── auth.js              # POST /api/auth/google (auth code exchange)
│   │   │   └── drive.js             # Drive upload, photos list, share, sheet API
│   │   ├── services/
│   │   │   ├── driveService.js      # Drive folder creation, file uploads, permissions
│   │   │   └── sheetsService.js     # Sheets creation, GPS row logging, sheet data
│   │   └── index.js                 # Express server entry point, CORS, routes
│   ├── .env.example                 # Template for backend environment variables
│   ├── package.json                 # Backend dependencies & scripts
│   └── package-lock.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Gallery.jsx          # Photo grid with search, filter, and sorting
│   │   │   ├── Gallery.module.css
│   │   │   ├── GpsWarningModal.jsx  # Confirmation dialog for photos without GPS
│   │   │   ├── GpsWarningModal.module.css
│   │   │   ├── MapView.jsx          # React-Leaflet OpenStreetMap visualizer
│   │   │   ├── MapView.module.css
│   │   │   ├── PhotoCard.jsx        # Individual photo card with thumbnail & status
│   │   │   ├── PhotoCard.module.css
│   │   │   ├── PhotoDetailModal.jsx # Authenticated inspection modal
│   │   │   ├── PhotoDetailModal.module.css
│   │   │   ├── ShareModal.jsx       # Drive user permission sharing dialog
│   │   │   ├── ShareModal.module.css
│   │   │   ├── SheetView.jsx        # Live tabular view of Google Sheet GPS log
│   │   │   ├── SheetView.module.css
│   │   │   ├── StatsCards.jsx       # Overview metrics banner
│   │   │   ├── StatsCards.module.css
│   │   │   ├── UploadButton.jsx     # Drag-and-drop workspace & compact upload CTA
│   │   │   └── UploadButton.module.css
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # In-memory authentication provider & hook
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx        # App layout shell, navigation, header
│   │   │   ├── Dashboard.module.css
│   │   │   ├── LoginPage.jsx        # Google OAuth login with topographic branding
│   │   │   └── LoginPage.module.css
│   │   ├── services/
│   │   │   ├── api.js               # Centralized fetch wrapper with Bearer token
│   │   │   ├── authService.js       # Calls backend /api/auth/google
│   │   │   └── driveService.js      # Calls backend /api/drive/* endpoints
│   │   ├── utils/
│   │   │   ├── exifUtils.js         # exifr GPS extraction and coordinate formatting
│   │   │   └── fileUtils.js         # File validation and timestamp derivation
│   │   ├── App.jsx                  # Root view switcher (Login vs Dashboard)
│   │   ├── index.css                # Global design system tokens and typography
│   │   └── main.jsx                 # Vite application mount
│   ├── index.html                   # HTML entry point with meta tags and font links
│   ├── vite.config.js               # Vite bundler configuration
│   ├── .env.example                 # Template for frontend environment variables
│   ├── package.json                 # Frontend dependencies & scripts
│   └── package-lock.json
│
├── .agents/                         # Project specifications and agent configurations
├── .gitignore                       # Git exclusion rules (.env, node_modules, dist)
├── DOCUMENTATION.md                 # Detailed technical engineering report
├── DOCUMENTATION.html               # Printable HTML version of engineering report
├── requirements.txt                 # Clarifies Python is not required
└── README.md                        # Project documentation (this file)
```

---

## Development Commands

| Directory | Command | Description |
|---|---|---|
| `backend/` | `npm run dev` | Start backend development server with auto-restart (`node --watch`) on port 4000 |
| `backend/` | `npm start` | Start backend production server on port 4000 |
| `frontend/` | `npm run dev` | Start Vite frontend development server on port 5173 |
| `frontend/` | `npm run build` | Build optimized frontend production bundle to `dist/` |
| `frontend/` | `npm run preview` | Locally preview the frontend production build |
| `frontend/` | `npm run lint` | Run ESLint check across all frontend JS/JSX files |

---

## Testing & Verification

### Automated Production Build Check
To verify that all frontend modules, JSX files, and CSS modules bundle without syntax errors:
```bash
cd frontend
npm run build
```
*Expected result: `✓ built in X.XXs` with exit code 0.*

### Backend Syntax Validation
To verify backend syntax and module imports:
```bash
cd backend
node --check src/index.js
node --check src/routes/auth.js
node --check src/routes/drive.js
node --check src/services/driveService.js
node --check src/services/sheetsService.js
```

### Manual Verification Workflow
1. **Login Test**: Sign in with Google; confirm no console errors.
2. **Drive Folder Test**: Verify `{User Name}` folder is created in Drive.
3. **GPS Photo Upload Test**: Upload an image with GPS; verify coordinates extracted and displayed in preview.
4. **Non-GPS Photo Test**: Upload an image without GPS; verify `GpsWarningModal` appears and allows canceling or proceeding.
5. **Sheets Sync Test**: Open `GPS Log` in Drive; verify photo filename, web link, coordinates, and timestamp are appended.
6. **Map View Test**: Navigate to Map tab; confirm pin marker displays on OpenStreetMap and clicking updates coordinate card.
7. **Share Test**: Share photo with `su1@vr2.in`; verify Drive permission response.
