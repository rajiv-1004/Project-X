# Project X — Task List

Source of truth for requirements and standards: `AGENTS.md`. Each task below must satisfy AGENTS.md Section 4 (engineering standards) before being marked complete — no exceptions for time or convenience.

**Status: Task 0 is already implemented and committed. Start at Task 1.**

## Task 0 — Google Authentication ✅ DONE
Committed. OAuth 2.0 authorization-code flow, backend token exchange, session handling.

## Task 1 — Drive folder auto-creation ✅ DONE
- Verified that `driveService.js`'s folder logic searches before creating, resolves `{Your Name}` via OAuth2 profile, and migrates/avoids duplicate folders.
- Manually verified in real Google Drive account.

## Task 2 — Photo upload to Drive ✅ DONE
- Verified upload flow: file validated client-side, multipart streamed to Drive folder.
- Manually verified in real Google Drive account.

## Task 3 — GPS EXIF extraction ✅ DONE
- Verified `exifUtils.js` extracts lat/long client-side and gracefully handles photos without GPS.
- Manually verified (`8.8110° N, 78.1422° E` extracted and cards without GPS show "No GPS").

## Task 4 — Google Sheet logging ✅ DONE
- Verified sheet auto-creation inside user folder.
- GPS data (file name, webViewLink, lat, lng, timestamp) logged.

## Task 5 — Gallery view ✅ DONE
- Verified thumbnails render with authenticated streaming, GPS coordinates display under cards, and auto-refresh works on upload.

## Task 6 — Map view ✅ DONE
- Verified clicking thumbnail opens interactive Leaflet OpenStreetMap view centered on photo coordinates.

## Task 7 — Drive-based sharing ✅ DONE
- Verified Drive permission sharing without public links. Tested with `su1@vr2.in`.

## Task 8 — UX pass across all features (In Progress)
- Confirm every async action (login, upload, folder/sheet creation, sharing) has a loading state, a disabled state while in flight, and a friendly error message on failure — per AGENTS.md Section 4.
- Confirm responsive layout on a narrow viewport.
- Remove any leftover `console.log()` debugging statements.

## Task 9 — API efficiency + cleanup pass
- Confirm no repeated folder/sheet searches once already found in a session.
- Remove unused dependencies, unused imports, dead code.
- Confirm no hardcoded IDs, folder names, or credentials anywhere in the codebase.

## Task 10 — Documentation
- Write the PDF report per AGENTS.md Section 7 (architecture, prompts used in order with reasoning, API setup steps, screenshot proof of sharing, standards-compliance explanation, challenges faced).

---

## Workflow rules for the agent
- Work through tasks **in order**, one at a time.
- After completing a task: run/test it yourself if possible, then **stop and report** what was done and what needs manual verification by the user.
- **Do not proceed to the next task until the user confirms the current one is verified and approved.**
- Make **one git commit per completed task**, using a Conventional Commits message matching the task (e.g. `feat: verify and harden Drive folder auto-creation logic`).
- If a task reveals that earlier code (e.g. from the original bulk generation) doesn't actually meet its acceptance criteria, fix it as part of that task — don't skip ahead assuming it's fine.