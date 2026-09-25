# Project X — Application Working Output & Proof

This directory contains visual proof and documentation artifacts verifying the end-to-end functionality of Project X against all assessment requirements.

---

## 🎥 Complete Video Demonstration

A full walk-through showing Google OAuth login, Drive folder auto-creation, geotagged photo uploads, client-side EXIF GPS extraction, Google Sheet logging, gallery & map exploration, and user-level Drive sharing is available here:

👉 **[Watch Full Video Demonstration (Google Drive)](https://drive.google.com/file/d/1eO_4GZHbmUk7u_TACAl-krneacvTkfWt/view?usp=sharing)**

---

## 📸 Output Proof Artifacts

| Screenshot | Description & Requirement Verified |
|---|---|
| **[`Login_Page.png`](./Login_Page.png)** | Split-panel Google OAuth 2.0 login screen with GIS authorization-code trigger. *(Req 1)* |
| **[`Dashboard.png`](./Dashboard.png)** | Field Operations Overview showing connected workspace folder, real-time counters, and the upload workspace. *(Req 2 & 3)* |
| **[`Drive_View.png`](./Drive_View.png)** | Authenticated Google Drive folder (`M. Rajiv`) containing uploaded field photos and the `GPS Log` spreadsheet. *(Req 2, 3, & 5)* |
| **[`Sheets_View.png`](./Sheets_View.png)** | Google Sheets `GPS Log` spreadsheet showing appended rows with Photo Name, Drive Web Link, Latitude, Longitude, and ISO Timestamp. *(Req 5)* |
| **[`Map_View.png`](./Map_View.png)** | Interactive OpenStreetMap (`react-leaflet`) view displaying pin markers at exact photo GPS coordinates with popup tooltips. *(Req 6 & 7)* |
| **[`Photo_Share.png`](./Photo_Share.png)** | Granular Drive permission sharing dialog confirming successful permission grant to `su1@vr2.in` (Editor/Viewer) without public links. *(Req 8)* |
