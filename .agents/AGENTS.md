# AGENTS.md — Project X

This file defines how any AI coding agent (Antigravity, Claude, Copilot, etc.) should work on this repository. Read this in full before generating, editing, or reviewing any code in this project.

## 1. What this project is

"Project X" is a take-home technical assessment (Round 2, internship). It will be evaluated against other candidates on functionality, code quality, prompting/AI-collaboration process, documentation, and problem-solving — so treat this as production software, not a demo or prototype.

## 2. Functional requirements (source of truth)

The app is a React application that must implement all of the following. Do not skip, stub, or fake any of these — each is graded.

1. **Google Authentication** — user signs in with their Google account (OAuth 2.0).
2. **Auto-create Drive folder** — on first login, create a folder named `{Your Name}` in the user's Google Drive. Search for an existing folder with that name before creating one — never create duplicates.
3. **Photo upload** — user can upload or take a picture of an application/document; each photo is saved into their `{Your Name}` Drive folder.
4. **GPS extraction** — read GPS EXIF metadata from each uploaded photo (client-side).
5. **Google Sheet log** — log GPS data (photo name/link, latitude, longitude, timestamp) into a Google Sheet inside the `{Your Name}` folder. Auto-create the sheet if it doesn't exist; never create duplicates.
6. **Gallery view** — thumbnails of all uploaded photos, GPS coordinates shown under each.
7. **Map view** — clicking a thumbnail opens a map showing where that photo was taken.
8. **Share feature** — a share icon per photo lets the user share it with any Google account via Drive's sharing permissions (not a public link). At least 3–5 photos must be shareable to `su1@vr2.in` with proof captured for documentation.

## 3. Tech stack (fixed — do not substitute without discussion)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite | No CRA, no Next.js — this is a client SPA plus a thin backend |
| Auth | `@react-oauth/google` (Google Identity Services) | Use the **authorization-code flow**, not implicit flow — the code exchange must happen on the backend |
| Backend | Node.js + Express | Minimal — exists only to hold secrets and call Google APIs server-side |
| Drive/Sheets API | `googleapis` (official Node client), backend-only | Never call Drive/Sheets APIs directly from the frontend |
| EXIF/GPS | `exifr` (`exifr.gps()`) | Client-side extraction; handle missing/corrupt EXIF gracefully |
| Map | `react-leaflet` + `leaflet` + OpenStreetMap tiles | No Google Maps, no paid map APIs, no tile downloading/offline caching — just standard OSM tile requests with attribution |
| Styling | Plain CSS Modules or Tailwind utilities | No component library (no MUI/Chakra/Ant) |
| State | React hooks/context | No Redux |
| Config | `.env` (frontend, Vite-exposed vars only) + `.env` (backend, secrets) | See Section 5 |

Do not add a dependency that isn't on this list without a stated technical reason, and never add one that ends up unused.

## 4. Engineering standards (apply to every file you generate or edit)

### No hardcoding
- No user-specific data, Google IDs, folder IDs, spreadsheet IDs, file IDs, URLs, credentials, or config values in code.
- All such values come from environment variables or are fetched at runtime through the relevant Google API.
- Never fabricate mock/fake data to make a feature look complete.

### Lightweight application
- Only add a library if a browser API can't reasonably do the job.
- No installed-but-unused dependencies.
- No unnecessary UI frameworks.
- Don't load functionality a given page/feature doesn't need.
- Keep bundle size, API call volume, memory, and runtime processing as low as reasonably possible — this should run comfortably on a low-resource machine.

### Production-style architecture
- Clear separation: `components/`, `services/`, `utils/`, `config/`, API logic.
- Reusable components, not duplicated code.
- Single responsibility per function/component.
- Meaningful, consistent naming.
- Centralized API/error handling where it makes sense.
- No unnecessary abstraction or over-engineering.
- Business logic stays out of presentation components.

### Validation and error handling
Handle all of the following gracefully, with no unhandled exceptions:
- Invalid/missing user input
- Invalid file type or oversized file before upload
- Missing or invalid EXIF/GPS metadata
- Google authentication failures
- Expired/invalid access tokens
- Drive API failures
- Sheets API failures
- Upload failures
- Network failures
- Permission/sharing failures
- Photos with no GPS data
- Duplicate folders/files

Never expose stack traces, raw API responses, internal exception messages, credentials, or tokens to the user. Show friendly messages instead, e.g. *"We couldn't upload this photo. Please check your connection and try again."* Detailed technical errors are for dev-mode logging only — never rendered in the production UI.

### Security
- Client secrets and access tokens live only on the backend — never in frontend code, bundles, or logs.
- Use the minimum required Google API scopes.
- No file is ever made publicly accessible.
- Sharing goes through Drive permissions exactly as specified — never a public link.
- Don't store sensitive auth data beyond what's needed.
- Don't log sensitive information.

### Clean code
- Small, readable functions; avoid deep nesting and duplicated logic.
- No unused imports, variables, components, or dependencies.
- No leftover debugging `console.log()` calls (a deliberate, controlled logging strategy is fine — random debug logs are not).
- Comments only where they add real value — not restating obvious code.

### Comments — required around
- Google OAuth flow
- Drive folder search/creation logic
- Drive upload logic
- EXIF extraction
- Sheets creation/logging logic
- Drive permission sharing
- Non-obvious error-handling decisions

### User experience
- Responsive layout
- Loading states
- Empty states
- Success feedback
- User-friendly error messages
- Disabled states during in-flight operations
- Confirmation before sensitive/destructive actions
- Accessible buttons/labels
- Consistent spacing, typography, and interaction patterns

No decorative or unrelated features added just to make the project look bigger.

### API efficiency
- Never re-search for a folder/sheet that's already been located this session.
- No polling, no duplicate calls.
- Fetch only what the current view needs.
- Reuse metadata already in hand where it's safe to do so.
- No unnecessary auto-refresh.

### Before marking any feature done, check
Normal case · empty state · invalid input · missing metadata · network failure · API failure · permission failure · duplicate data · refresh/reload behavior · authentication state · mobile/responsive behavior.

## 5. Environment variables (no real values committed — ever)

**Frontend `.env`**
```
VITE_GOOGLE_CLIENT_ID=
VITE_BACKEND_URL=
```

**Backend `.env`**
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
PORT=
```

`.env` files must be in `.gitignore`. Only `.env.example` (with empty/placeholder values) is committed.

## 6. What NOT to do

- Don't artificially complicate the architecture to look more "production-grade."
- Don't add features unrelated to the 8 requirements above.
- Don't use Google Maps or any paid/billed API for anything — this must run entirely free.
- Don't call Drive/Sheets APIs from the frontend.
- Don't skip error states to save time — they're graded.
- Don't generate code in fragments when a complete file is practical — provide full files and state exactly where each one goes.

## 7. Documentation deliverable (required alongside the code)

A PDF report must accompany the repo, covering:
- App overview and architecture
- Every AI prompt used, in order, with the reasoning behind each
- How Google Auth, Drive API, and Sheets API were set up
- Screenshot proof of sharing a photo with `su1@vr2.in`
- Why lightweight libraries were chosen and unnecessary ones avoided
- How hardcoding was avoided
- How the app is structured
- How API calls were minimized
- How validation and error-hiding-from-users work
- How auth/permissions and security were handled
- How edge cases are handled
- How maintainability was kept up
- Trade-offs made, and challenges faced + how they were resolved

Write this as real engineering reasoning, not marketing language.

## 8. Model selection in Antigravity

This doesn't change *what* gets built or the standards in Sections 3–4 — it applies regardless of which model is running. It's guidance on which model to have active for which kind of work, based on what's typically available in Antigravity's model picker.

| Model | When to use it |
|---|---|
| **Claude Sonnet (Thinking mode)** | Default for all feature-build work — the 8 requirements in Section 2, following the commit sequence in Section 9. Strong at precisely tracking a long, detailed spec like this file across many files; "Thinking" mode helps with trickier logic (OAuth token exchange, folder/sheet duplicate-checking). |
| **Claude Opus (Thinking mode)** | Escalate here only when Sonnet gets stuck or produces something wrong — a subtle auth/permissions bug, a persistent Drive/Sheets API error, etc. Don't default to it for routine feature work; it's heavier than needed. |
| **A fast/low-latency model (e.g. a Flash-tier Gemini model)** | Good fit for the `webapp-testing` skill's browser-driven verification pass once a feature is built — speed matters more than deep reasoning for click-through/screenshot verification loops. |
| **A low-reasoning-tier or general open-weight model** | Avoid for this project — multi-file integration work under a strict spec needs a model that reliably tracks constraints, which lighter/lower-tier options tend to do less reliably. |

If Antigravity's available models change, re-evaluate against this same logic: strongest available model with careful/deliberate reasoning for the build itself, fastest available model for repetitive verification passes.

### Note on available skills

This project has four Agent Skills under `.agents/skills/`: `google-drive-api`, `frontend-developer`, `webapp-testing`, `env-config`. These should trigger automatically based on task relevance — but if you're about to write Drive/Sheets API calls, frontend component code, browser-based tests, or handle environment config, check whether the matching skill applies before proceeding from scratch.

## 9. Git workflow — commit phase by phase

This repo is graded partly on process, so the commit history itself is part of the deliverable — it should read like a real engineering log, not one giant "final code" commit.

### Rules
- **One commit per feature/phase**, not one commit per file and not one commit for the whole app. Each commit should leave the app in a working (or at least non-broken) state.
- **Never commit `.env` files or any real credential/token/ID.** Only `.env.example` with empty values goes into git. Confirm `.gitignore` covers `.env`, `.env.local`, `node_modules/`, and any build output before the first commit.
- **Commit messages use [Conventional Commits](https://www.conventionalcommits.org/):** `feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`, `refactor: ...`, `test: ...`. Keep the summary line under ~72 chars; use the body for the "why" when it's not obvious.
- Don't squash the whole history at the end — the progression is the evidence the assessment is asking for (Section 7: "prompts used, in order, along with why").

### Suggested commit sequence

| # | Type | Message | Covers |
|---|---|---|---|
| 1 | `chore` | initialize project structure (frontend + backend scaffold) | Repo skeleton, package.json, .env.example, .gitignore, README stub |
| 2 | `feat` | add Google OAuth authentication flow | Requirement 1 |
| 3 | `feat` | add Drive folder auto-creation with duplicate check | Requirement 2 |
| 4 | `feat` | implement photo upload to user's Drive folder | Requirement 3 |
| 5 | `feat` | extract GPS EXIF metadata from uploaded photos | Requirement 4 |
| 6 | `feat` | log photo GPS data to Google Sheet | Requirement 5 |
| 7 | `feat` | build gallery view with thumbnails and coordinates | Requirement 6 |
| 8 | `feat` | add map view for photo location | Requirement 7 |
| 9 | `feat` | implement Drive-based photo sharing | Requirement 8 |
| 10 | `feat` | add loading, empty, and error states across the app | UX + error-handling standards |
| 11 | `refactor` | tighten API call efficiency and remove duplicate requests | API-efficiency standards |
| 12 | `docs` | add README with local setup instructions | Submission requirement |
| 13 | `docs` | add engineering documentation report | Submission requirement |
| 14 | `chore` | final cleanup — remove unused deps, dead code, debug logs | Section 6 pre-submission checklist |

Adjust the exact split if a phase naturally breaks into two commits (e.g., separate `feat: add Drive API client setup` from `feat: add folder auto-creation` if that's how the work actually happens) — the goal is an honest, readable log of how the app was actually built, not forcing every phase into exactly one commit.

### Branching
For a solo assessment repo, committing directly to `main` in this sequence is fine and keeps things simple — a full branch-per-feature + PR workflow is optional polish, not required. If you do want to show that skill too, branch as `feat/google-auth`, `feat/drive-folder`, etc., and merge each via a PR into `main` (even without a second reviewer) so the PR descriptions become extra documentation of intent.

## 10. Submission

- GitHub repo with full source + README (clear local setup/run steps)
- PDF documentation report (Section 7)
- Deadline: **30 Sep 2026**
- Reply to `su1@vr2.in` with the GitHub link