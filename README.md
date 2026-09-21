# Project X — Photo Drive Logger

A React + Node.js application that lets users sign in with Google, upload photos to their Google Drive, extract GPS EXIF metadata, log coordinates to a Google Sheet, view a gallery of all uploaded photos, and share photos with other Google accounts.

---

## Requirements

| Tool | Version |
|---|---|
| Node.js | ≥ 18 |
| npm | ≥ 9 |

---

## Google Cloud Setup (one-time)

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the following APIs:
   - **Google Drive API**
   - **Google Sheets API**
   - **People API**
3. Create an **OAuth 2.0 Client ID** (type: *Web application*):
   - Authorised JavaScript origin: `http://localhost:5173`
   - Authorised redirect URI: `http://localhost:4000/auth/google/callback`
4. Copy the **Client ID** and **Client Secret**.

---

## Local Setup

### 1. Clone and enter the repo

```bash
git clone <repo-url>
cd "project X (final version)"
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Fill in `backend/.env`:

```
GOOGLE_CLIENT_ID=<your client id>
GOOGLE_CLIENT_SECRET=<your client secret>
GOOGLE_REDIRECT_URI=http://localhost:4000/auth/google/callback
PORT=4000
```

Install dependencies:

```bash
npm install
```

### 3. Configure the frontend

```bash
cd ../frontend
cp .env.example .env
```

Fill in `frontend/.env`:

```
VITE_GOOGLE_CLIENT_ID=<your client id>
VITE_BACKEND_URL=http://localhost:4000
```

Install dependencies:

```bash
npm install
```

### 4. Run both servers

**Terminal 1 — Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Project Structure

```
project X (final version)/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── googleClient.js     # OAuth2 client singleton
│   │   ├── routes/
│   │   │   ├── auth.js             # POST /api/auth/google
│   │   │   └── drive.js            # Drive + Sheets endpoints
│   │   ├── services/
│   │   │   ├── driveService.js     # Drive API calls
│   │   │   └── sheetsService.js    # Sheets API calls
│   │   └── index.js                # Express entry point
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Gallery.jsx         # Photo grid
    │   │   ├── MapView.jsx         # react-leaflet map
    │   │   ├── PhotoCard.jsx       # Thumbnail + share
    │   │   └── UploadButton.jsx    # Upload + GPS extraction
    │   ├── context/
    │   │   └── AuthContext.jsx     # Auth state (in-memory)
    │   ├── pages/
    │   │   ├── Dashboard.jsx       # Authenticated shell
    │   │   └── LoginPage.jsx       # Google sign-in
    │   ├── services/
    │   │   ├── api.js              # Fetch wrapper
    │   │   ├── authService.js      # Code exchange call
    │   │   └── driveService.js     # Drive/Sheets API calls
    │   ├── utils/
    │   │   ├── exifUtils.js        # GPS EXIF extraction
    │   │   └── fileUtils.js        # File validation
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    ├── .env.example
    └── package.json
```

---

## Security Notes

- Google client secret lives only on the backend — never in frontend code or bundles.
- Auth tokens are kept in React state (in-memory only) — they are cleared on page reload.
- No file is ever made publicly accessible; sharing uses Drive user-level permissions.
- Only the minimum required Google API scopes are requested.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite |
| Auth | `@react-oauth/google` (authorization-code flow) |
| Backend | Node.js + Express |
| Drive / Sheets | `googleapis` (backend only) |
| EXIF / GPS | `exifr` (client-side) |
| Map | `react-leaflet` + OpenStreetMap tiles |
| Styling | CSS Modules (no UI framework) |
| State | React context + hooks |
