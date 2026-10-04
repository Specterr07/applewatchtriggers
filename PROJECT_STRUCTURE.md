# Project Structure — task-logger

A small **Flask** app ("Sheev") that does four things:

1. **Time Log** — an Apple Watch Shortcut (and the webpage) hits `/toggle` to
   start/end a task, stored as one row per task in SQLite (`tasks.db`) so
   every task has a stable id - what a bento-card grid and a per-task detail
   page link to. Durations are calculated automatically.
2. **Canvas** — a tldraw drawing surface inside the React app
   (`/canvas`). Its drawing is saved server-side (`GET`/`PUT /api/canvas`, backed by
   `canvas.db`) so the same canvas shows up on any device, not just the
   browser that drew it.
3. **Notes** — record a voice note in the browser; the server transcribes it
   (Groq's Whisper API), gives it a short AI title (Groq's
   `openai/gpt-oss-20b`, optional - never blocks the save), re-encodes it
   to a small mono file (ffmpeg), and stores the compressed audio in Tigris
   object storage plus the transcript and title in SQLite (`notes.db`). The
   original high-quality upload is never kept. Notes are the app's main job:
   Home is notes-first.
4. **Messaging Channel (Telegram)** — connect Telegram via deep-linking;
   send voice notes directly to the Telegram bot to have them transcribed
   and stored into `notes.db` like web notes, or receive messages from the
   server (`send_to_user`). State and links live in SQLite (`channels.db`).

It is deployed to **Fly.io**, and the deploy runs automatically from GitHub
Actions on every push to `main`.

**Frontend cutover done** (`docs/features/frontend-redesign.md`, M5): the
React app now serves `/` and every screen URL. The old single-file webpage
(`static/index.html`) no longer serves `/`; the file is still in the repo
pending deletion (see "static/ and frontend/" below).

- **Repo:** https://github.com/Specterr07/applewatchtriggers
- **Live app:** https://applewatchtriggers.fly.dev

---

## Top-level files and folders

| Path | What it is | Why it exists |
| --- | --- | --- |
| `app.py` | Just app wiring: creates the Flask app, sets up Swagger docs, registers the blueprints below, and the 404 handler. No routes or storage logic live here anymore. | Kept intentionally tiny (~50 lines) so it's obvious at a glance what the app is made of. |
| `routes/` | One file per feature's HTTP routes: `tasks.py` (`/toggle`, `/status`, `/api/logs*`), `canvas.py` (`/api/canvas`, GET/PUT), `notes.py` (`/api/notes*`, incl. `PATCH /api/notes/<id>` to rename), `telegram.py` (`/telegram/webhook`, `/api/channels/telegram/link`, `/api/channels/test`), `pages.py` (`/`, `/tasks`, `/tasks/<int:id>`, `/time-log`, `/notes`, `/notes/<int:id>`, `/canvas`, `/integrations/<name>`, `/settings`, `/more` → the React app's `index.html`; `/app/assets/<file>` → its built files; `/app` + `/app/<path>` → 301 to the same path without `/app`). Only that explicit list of page URLs returns HTML; everything else still gets `app.py`'s JSON 404. | Each route file only parses the request, calls into `services/`, and shapes the JSON response - no file/database code mixed in. |
| `services/` | Storage and cross-cutting logic the routes call into: `tasks_db.py` (SQLite CRUD for tasks), `canvas_db.py` (SQLite for the canvas's single saved snapshot), `notes_db.py` (SQLite for note metadata, incl. the nullable `title` column - added in place to older databases), `channels_db.py` (SQLite for Telegram links, one-time codes, seen updates), `channels.py` (channel abstraction & `send_to_user`), `telegram.py` (Telegram Bot API wrapper), `note_pipeline.py` (shared audio note ingest pipeline), `object_storage.py` (Tigris via boto3 - upload/delete/presigned playback URLs), `audio_compression.py` (ffmpeg re-encode), `transcription.py` (Groq Whisper), `titling.py` (short AI note titles via Groq `openai/gpt-oss-20b`; never raises - returns `None` on any failure), `auth.py` (the `require_key` decorator), `time.py` (`local_now()`/`TIMEZONE`), `config.py` (`DATA_DIR`). | Keeps file/database/external-API code out of the route files, and means the same storage/service functions aren't duplicated across routes that need them. |
| `requirements-dev.txt` | Development-only Python tools (`pytest`), on top of `requirements.txt`. Install with `.venv/bin/pip install -r requirements-dev.txt`. | Keeps test tooling out of the production image. |
| `tests/` | pytest suite: `test_watch_contract.py` pins the Apple Watch contract (`/toggle`, `/status`, `?key=` + `X-API-Key`, response shapes, 401s); `test_page_routing.py` checks which URLs return the React app vs. JSON 404s, the `/app/*` → root 301s, `/`, and `/docs`; `test_note_titles.py` covers title cleanup, a failed title never blocking a save, upgrading an old `notes.db`, and `PATCH /api/notes/<id>`. `conftest.py` points `DATA_DIR` at a temp folder and sets a test `API_KEY` before the app is imported. Run with `.venv/bin/python -m pytest`. | The Watch Shortcut can't be updated alongside a deploy, so its contract needs a guard; the migration changes page routing, which must never swallow API errors. |
| `scripts/` | One-off maintenance scripts. `backfill_note_titles.py` gives an AI title to every note that has none (run once on Fly with `fly ssh console -C "python scripts/backfill_note_titles.py"`; safe to re-run). Copied into the Docker image so it can run on the server. | Old notes predate titles; a script is simpler than UI that's useless after one use. |
| `pytest.ini` | pytest config: test folder, and the repo root on the import path so tests can `import app`. | So `python -m pytest` works from the repo root with no extra flags. |
| `requirements.txt` | Python dependencies (`Flask`, `flask-swagger-ui`, `tzdata`, `groq`, `boto3`). `gunicorn` is installed separately in the Dockerfile for production. | Keeps the backend install minimal. `tzdata` ensures `zoneinfo` can find timezone data even on the slim base image, which doesn't reliably ship its own; `groq`/`boto3` are the Notes feature's transcription and Tigris clients. |
| `static/` | `openapi.yaml`, plus the **old** webpage file (`static/index.html`) that no longer serves `/`. | Flask serves this folder directly at `/static/...`. `openapi.yaml` stays. |
| `static/index.html` | The old webpage — login, Time Log and Notes in one file with inline `<style>`/`<script>`. **No longer served at `/`** (the React app is); Flask's static folder still serves it as a plain file at `/static/index.html`. | Kept for now as a fallback reference; deleted after the redesign's §13 parity walk-through (`TODO.md` §2). |
| `static/openapi.yaml` | The OpenAPI 3 contract for the API. Flask serves it at `/static/openapi.yaml`, and `flask-swagger-ui` renders it as browsable docs at `/docs`. | This is the file a frontend engineer reads to build against the API without opening `app.py`. |
| `frontend/` | The **React app** (React 19 + TypeScript + Vite + Tailwind CSS v4), served at `/`. Root: `index.html` (Vite entry + a tiny inline script that applies the saved theme before first paint), `vite.config.ts` (`base: '/app/'` for builds so assets live at `/app/assets/*`, `'/'` for the dev server; `@/` → `src/` alias, dev proxy to Flask on :8080), `package.json` / `package-lock.json`, `tsconfig*.json`. Code lives in `src/` (below). | One app replaces both old frontends, with shared components, a design system, and real URLs. Built in an isolated Docker stage; only its compiled output reaches the final image. |
| `frontend/src/` | `main.tsx` (mounts React), `App.tsx` (providers + router only), `router.tsx` (every screen's URL), `config.ts` (router basename - `''`, the app is at the root; localStorage keys incl. `sheev_telegram_last_test`, `SERVER_TIMEZONE`, breakpoints). `api/` - the only code that calls `fetch` (`client.ts` handles the API key, the `{ok, message}` envelope, and 401 → sign-out; `tasks.ts` (`/status`, `/toggle`, `/api/logs`, `PATCH`/`DELETE /api/logs/<id>`), `notes.ts` (`GET`/`PATCH`/`DELETE /api/notes`, and the voice-note upload - `POST /api/notes` via XMLHttpRequest so the UI can show the real "uploaded -> now transcribing" moment), `canvas.ts`, `channels.ts` (`POST /api/channels/telegram/link`, `POST /api/channels/test`); `queryClient.ts` - React Query setup and cache keys `['tasks']`, `['notes']`, `['status']`). `types/` - API response shapes (`task.ts`, `note.ts`, `channel.ts`, `api.ts`). `hooks/` - `useTasks` / `useNotes` / `useStatus` (cached server data; `useStatus` is `/status` for the Apple Watch screen, no polling), `useGuardedToggle` (Start/Stop: checks `/status` before `/toggle`, never sends a name on Stop), `useTaskMutations` (edit/delete; reopening re-checks `/status` so two tasks can never be running), `useDeleteNote`, `useRenameNote`, `useCloseDetail` (back from a detail view), `useElapsedSeconds` (local recording timer), `useNow` (server-timezone clock for live timers), `useTheme`, `useMediaQuery`, `useShortcuts` (desktop keyboard shortcuts, spec §6.2: ignored while typing or in a dialog, off on the canvas). `features/` - one folder per area: `home/` (Home, notes-first: a big Record card, the newest notes grouped by day, and a slim `RunningTaskStrip` (running task + timer + Stop, or "Start a task"); `homeStats.ts` + `RecentActivity` hold the activity feed the Apple Watch screen reuses), `tasks/` (Tasks = *what* you worked on: search, Active/Completed filter, 50-at-a-time client-side "Show more", cards on phone/tablet and a table on desktop; `/tasks/:id` detail with edit, reopen, Start again, Stop and delete - a drawer with a sidebar, full-screen on phones), `timelog/` (Time Log = *when*: Today / 7 / 30 days / All, grouped by start day with daily totals; `timeLog.ts` holds the range/grouping logic), `notes/` (voice notes: `recorderController.ts` is the recording state machine - idle / requesting / recording / uploading / processing / success / error, keeping a failed recording for Retry - wrapped by `RecorderProvider` for the whole app; `RecorderPanel` + `RecorderStatusPill`; `noteText.ts` (title fallback, search over titles + transcripts, `groupNotesByDay`); `NoteList` / `GroupedNoteList` (title, one-line preview, grouped under Today / Yesterday / date) used by Home and Notes; note detail with an editable title, playback/copy/delete, and `audioRecovery.ts` / `useNoteAudio.ts`, which refresh expired playback links once and then report a real failure), `capture/` (Capture menu - start/stop a task, record a voice note, open the canvas - plus the "Start a task" sheet, opened from anywhere via `CaptureProvider`), `auth/` (sign-in gate, same session rules and keys as the old page), `canvas/` (lazy-loaded tldraw screen + save logic), `watch/` (Apple Watch: `/status` reachability and next press, Shortcut URL with masked key + Reveal/Copy, how-it-works flow, last 10 start/stop events, troubleshooting), `telegram/` (connect via a one-time link or code with a 10-minute countdown, send a test message; the last successful test time is kept in this browser because the server can't report link status), `settings/` (theme, session, read-only time zone, links to integrations and `/docs`). `components/ui/` - reusable primitives (Button incl. `danger`, Input, SearchInput, Card, Sheet, Dialog, ResponsiveDialog, Drawer, ConfirmDialog, SegmentedControl, StatusPill, Spinner, Skeleton, EmptyState, Toaster). `components/layout/` - AppShell, Sidebar, BottomNav (Home · Notes · Capture · Tasks · More), nav config (sidebar: Home, Notes, Tasks, Time Log, Canvas), Page frame, DetailScreen (phone full-screen detail), KeyboardShortcuts (wires the shortcuts and the `?` help), 404/error pages. `utils/` - `time.ts` (parses the backend's timezone-less timestamps by hand - never `new Date(string)`; date keys, day headings, form conversions), `tasks.ts` (minutes worked per task - the one calculation Home, Tasks and Time Log all share), `notifyError.ts`, safe localStorage, session, `cn()` class helper. `*.test.ts` files next to the code they test run with vitest (`npm test`). `styles/` - `tokens.css` (design tokens, light + dark) and `globals.css` (Tailwind theme mapping). | Folder layout and rules come from `docs/features/frontend-redesign.md` §8. |
| `Dockerfile` | **Multi-stage build.** Stage 1 (`node:20-slim`) runs `npm ci` + `npm run build` on `frontend/` and produces `frontend/dist`. Stage 2 (`python:3.12-slim`) `apt-get install`s `ffmpeg`, installs Python deps, copies `app.py`, `routes/`, `services/`, `static/`, `scripts/`, and **only** `frontend/dist` (as `web_dist/`), then runs gunicorn (`--timeout 120`, longer than the 30s default - `POST /api/notes` does upload + transcription + compression + a Tigris upload in one request). | Node and npm never reach the production image — only the compiled app's JS/CSS does. This is why `frontend/` can have heavy build tooling without bloating the deployed app. `ffmpeg` isn't in `python:3.12-slim` by default, so Notes needs it installed explicitly. |
| `fly.toml` | Fly.io app config: app name, region (`sin`), the persistent volume mounted at `/data`, `DATA_DIR=/data`, `TIMEZONE=Asia/Kolkata`, and the HTTP service on port 8080. Does **not** list `GROQ_API_KEY` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_ENDPOINT_URL_S3` / `BUCKET_NAME` / `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` / `TELEGRAM_WEBHOOK_SECRET` - those are Fly secrets (`fly secrets set ...`), kept out of this (git-tracked) file the same way `API_KEY` already is. | `tasks.db`, `canvas.db`, `notes.db`, and `channels.db` all live on the Fly volume (`/data`), **not** in the image or git, so data survives redeploys. `TIMEZONE` fixes timestamps to your local time regardless of the container's own (UTC) clock. The React app reads timestamps in the same zone, so `SERVER_TIMEZONE` in `frontend/src/config.ts` must match it. |
| `.github/workflows/deploy.yml` | GitHub Actions workflow with two jobs. `test` runs on every push to `main` and every pull request into `main`: `pytest` (Python 3.12), then in `frontend/` `npm ci`, `npm run lint`, `npm test`, `npm run build` (Node 20 - both versions match the Dockerfile). `deploy` needs `test` to pass and runs only on a push to `main`: install `flyctl`, run `flyctl deploy --remote-only` with the `FLY_API_TOKEN` secret. | Automates what used to be a manual `fly deploy`, and stops a failing test, lint error or broken build (including a broken Watch contract) from reaching production. |
| `.gitignore` | Excludes every `*.db` file (`tasks.db`/`canvas.db`/`notes.db`/`channels.db` - real data, only ever meant to live on the Fly volume), Python caches, `.venv/`, editor folders, `.env`, the generated frontend output (`frontend/node_modules/`, `frontend/dist/`, `*.tsbuildinfo`, `web_dist/`), and `Claude outputs/` (local scratch files an agent saves, e.g. rendered diagram PNGs). | Everything listed is either a local/build artifact or real runtime data - neither belongs in git. |
| `CLAUDE.md` | Standing instructions for AI agents working in this repo: start at `docs/claude-handoff.md`; follow the feature process (`docs/PROCESS.md`); keep `TODO.md`, the handoff's status table and this file (`PROJECT_STRUCTURE.md`) in sync as part of the same change; plus a workaround for a local-preview tooling quirk unrelated to this app's own code. | So an out-of-date structure doc gets caught and fixed immediately, and so a fresh session doesn't waste time rediscovering a known tooling gotcha. |
| `GEMINI.md` | A symlink to `CLAUDE.md` so that Antigravity agents automatically discover and follow the exact same standing project instructions as Claude. | Ensures consistency across different AI assistants without maintaining duplicate rule files. |
| `ARCHITECTURE.md` | A Mermaid diagram + written summary of what's actually deployed right now (build pipeline, Flask blueprints, the four SQLite databases, Tigris/Groq, Telegram, both clients) - verified against the real code, not memory. | A single "how does this all fit together, and why" reference, separate from this file's per-path table. |
| `docs/plans/` | Older, pre-process feature records: `PLAN_NAMED_TASKS_BENTO_CARDS.md`, `PLAN_CANVAS_SAVE.md`, `PLAN_VOICE_NOTES.md` (all three shipped - written up retroactively as a decision record; the canvas and voice-notes ones carry a "Since then" note), `PLAN_MULTI_USER.md` (deferred - built last) and `PLAN_LLM_REMINDERS.md` (next new feature, not specced yet - moves into `docs/features/` when work starts). Both unbuilt plans separate what's decided from what's still open, without guessing at the gaps. | A durable record of *why* a feature looks the way it does, and - for what's still ahead - what's actually settled vs. still needs deciding. |
| `docs/` | `claude-handoff.md` (**start here** - where the project stands, reading order, key rules, how to run checks), `PROCESS.md` (the 3-step Think → Draw → Build process), `STANDARDS.md` (naming/file conventions), and `features/` (one file per feature, plus `_template.md`: `frontend-redesign.md` (built, sign-off open), `messaging-channel.md` (shipped), `notes-first-ai-titles.md` (shipped)). | Organizes all structural plans, feature docs, and codebase conventions in one place. |
| `TODO.md` | The roadmap & backlog: shipped, now (portfolio wrap-up), next (redesign sign-off), known bugs, later (reminders), deferred (multi-user), ideas, and dropped. | One place to see what's next without re-reading every plan file. |
| `FUTURE_ARCHITECTURE.md` | A second Mermaid diagram showing what `ARCHITECTURE.md` becomes after the multi-user pivot, color-coded: decided, genuinely undecided, and removed (Apple Push). Speculative, not a build plan - the pivot itself is deferred. | Makes the gaps in the multi-user plan visible without pretending they're resolved. |
| `.dockerignore` | Keeps `node_modules/`, `dist/`, `web_dist/`, `.venv/`, `.git/`, `.github/`, and `*.db` out of the Docker build context. | Stops a macOS-built `node_modules` from being copied over the container's fresh Linux `npm install` (which would break native binaries), and keeps the image small and free of real data files. |
| `.venv/` | Local Python virtual environment. | Local only — gitignored, never deployed (the Docker image builds its own environment). |
| `.claude/launch.json` | Tells the Claude Code browser-preview tool how to start this app locally: `.venv/bin/python -m flask --app app run --port 8080 --debug`. | Lets `preview_start` (used during development in this tool) launch the right process by name instead of guessing. Committed to git - it's project config, not a personal/local setting. |

---

## `static/` and `frontend/`: the migration (cut over)

These used to be deliberately separate: a build-free webpage in `static/`
and a tldraw-only React app in `frontend/`. The frontend redesign
(`docs/features/frontend-redesign.md`) **reverses that decision** - a design
system, shared components and real URLs now matter more than keeping the
main page build-free - so both become one React app in `frontend/`.

It happened gradually, so there was always a working app. The cutover is
now done:

| | During migration | Now (after cutover) |
| --- | --- | --- |
| `/` | Old webpage (`static/index.html`) | React app |
| `/app/...` | React app | Redirects (301) to the same path without `/app` |
| `/canvas` | Redirected to `/app/canvas` | React app's canvas (lazy-loaded tldraw) |
| Built files | `/app/assets/*` | `/app/assets/*` (unchanged) |

The React app kept the old page's localStorage keys (`task_logger_api_key`,
`task_logger_session_last_active`), so anyone signed in before the cutover
stays signed in. `static/index.html` is still in the repo (reachable only
as a file at `/static/index.html`) until it's deleted.

**Rollback:** `git revert` of the cutover commit puts the old page back at
`/` and the React app back at `/app`.

---

## Why tasks are in SQLite, not CSV

Tasks used to live in `tasks.csv`, appended as separate Start/End rows.
That changed because a bento-card grid and a per-task detail page both need
something CSV rows don't have: a **stable id** to link to, that's never
reused even after the task behind it is deleted or edited. SQLite's
`AUTOINCREMENT` gives that for free. (The old `tasks.csv` test data was
not migrated; `tasks.db` started empty.)

---

## Notes: audio in Tigris, metadata in SQLite

A voice note's audio (compressed, mono, low-bitrate) lives in Tigris
object storage, not in a database - `notes.db` only stores the
transcript, its short title (nullable), the object's key, and a timestamp. `GET /api/notes` mints a
fresh presigned playback URL for each note on every request rather than
storing a permanent one, since a stored URL would just be a presigned
link quietly expiring later - the object key is the only part that's
actually stable.

Titles come from `services/titling.py` (Groq `openai/gpt-oss-20b`, first
1500 characters, `temperature=0`, low reasoning effort), called inline right
after transcription. Failures are logged with a `[titling]` prefix (`fly logs`). It never raises: if Groq is rate-limited or down, the note
saves with `title = NULL` and the app shows the transcript's first words.

Needs `GROQ_API_KEY` (transcription + titles) and `AWS_ACCESS_KEY_ID` /
`AWS_SECRET_ACCESS_KEY` / `AWS_ENDPOINT_URL_S3` / `BUCKET_NAME` (Tigris)
set as env vars to fully work - without them, recording still runs
client-side but saving a note fails with a clear error instead of a
silent one.

---

## Channels: Telegram bot integration & channels.db

Messaging integrations store their channel link states, one-time verification
pairing codes, and processed webhook update IDs in SQLite (`channels.db`).
Incoming voice notes from Telegram are downloaded, passed through the shared
`services/note_pipeline.py` pipeline (Groq transcription + AI title + ffmpeg
compression + Tigris upload), and stored into `notes.db`. The bot's reply
shows the title.

Outbound messages are routed via `services/channels.py:send_to_user`, which
currently sends messages through `services/telegram.py`. Requires
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, and `TELEGRAM_WEBHOOK_SECRET`
set as Fly secrets / environment variables.

---

## Building / running

**Backend (local):**

```
.venv/bin/python -m flask --app app run --port 8080
```

Serves the React app at `/`, the API at `/toggle` `/status` `/api/...`, and the
docs at `/docs`. The React app needs its compiled files present as
`web_dist/` next to `app.py` (see below).

**React app (local):**

```
cd frontend && npm install && npm run build      # produces frontend/dist/
cp -R frontend/dist ../web_dist                  # so Flask's page routes can find it
```

Or, for live reloading while editing: run Flask as above, then
`cd frontend && npm run dev` and open `http://localhost:5173/` - the Vite
dev server forwards `/api`, `/toggle` and `/status` to Flask on port 8080.

**Tests:**

```
.venv/bin/pip install -r requirements-dev.txt    # once
.venv/bin/python -m pytest                       # backend: Watch contract + page routing
cd frontend && npm test                          # frontend: unit tests (vitest)
cd frontend && npm run build && npm run lint     # frontend: type-check, build, lint
```

**Production:** `docker build` does the frontend build automatically — Stage 1
builds `frontend/` and Stage 2 copies `frontend/dist` in as `web_dist/`. The
Vite `base: '/app/'` setting makes the built asset URLs line up exactly with
Flask's `/app/assets/<file>` route, so no path config is needed at runtime.
