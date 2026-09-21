# Project X — Task List

Source of truth for requirements and standards: `AGENTS.md`. Each task below must satisfy AGENTS.md Section 4 (engineering standards) before being marked complete — no exceptions for time or convenience.

**Status: Task 0 is already implemented and committed. Start at Task 1.**

## Task 0 — Google Authentication ✅ DONE
Committed. OAuth 2.0 authorization-code flow, backend token exchange, session handling.

## Task 1 — Drive folder auto-creation
- Verify (don't just assume) that `driveService.js`'s folder logic actually searches before creating, and never creates a duplicate `{Your Name}` folder on repeat logins.
- Test: log in twice with the same account, confirm only one folder exists in Drive.
- Handle: folder search failure, folder creation failure — friendly error messages, no raw API errors shown to the user.
- Acceptance: manually verified in a real Google Drive account, not just code review.

## Task 2 — Photo upload to Drive
- Verify upload flow: file picked/captured → validated (type + size, per `fileUtils.js`) → uploaded into the correct `{Your Name}` folder.
- Handle: invalid file type, oversized file, upload failure, network failure during upload — each with a friendly message and a disabled/loading state on the upload button while in flight.
- Acceptance: upload a real photo, confirm it appears in the correct Drive folder.

## Task 3 — GPS EXIF extraction
- Verify `exifUtils.js`'s `exifr.gps()` wrapper correctly extracts lat/long from a photo that has GPS data, and returns null/handles gracefully for one that doesn't.
- Test with at least one photo that has GPS metadata and one that doesn't (e.g. a screenshot).
- Acceptance: both cases produce correct behavior with no crash, no undefined values reaching the UI.

## Task 4 — Google Sheet logging
- Verify sheet auto-creation (search-before-create, no duplicates) inside the `{Your Name}` folder.
- Verify each upload appends a row with: photo name/link, latitude, longitude, timestamp.
- Handle: sheet creation failure, append failure — friendly messages.
- Acceptance: check the real Sheet after 2-3 uploads, confirm rows are correct and no duplicate sheets were created.

## Task 5 — Gallery view
- Verify thumbnails render for all uploaded photos, GPS coordinates shown under each.
- Handle: empty state (no photos yet), loading state (fetching photo list), error state (failed to fetch).
- Acceptance: gallery accurately reflects what's actually in Drive, including after a page refresh.

## Task 6 — Map view
- Verify clicking a thumbnail opens a map (react-leaflet + OSM tiles) centered on that photo's coordinates.
- Handle: photo with no GPS data — map view should explain this clearly, not crash or show an empty/broken map.
- Acceptance: works for a photo with GPS, degrades gracefully for one without.

## Task 7 — Drive-based sharing
- Verify the share feature on each photo shares via Drive permissions (not a public link) to an email the user enters.
- Handle: invalid email format, sharing API failure, sharing with an account that doesn't exist.
- Test requirement: share 3–5 photos with `su1@vr2.in` and capture a screenshot as proof (needed for the documentation report).
- Acceptance: confirmed via Drive's own sharing UI that permissions were actually granted, not just a success message in the app.

## Task 8 — UX pass across all features
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