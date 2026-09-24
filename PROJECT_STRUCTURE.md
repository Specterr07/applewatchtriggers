# Project Structure — task-logger

A small **Flask** app that does three things:

1. **Time Log** — an Apple Watch Shortcut (and the webpage) hits `/toggle` to
   start/end a task, stored as one row per task in SQLite (`tasks.db`) so
   every task has a stable id - what a bento-card grid and a per-task detail
   page link to. Durations are calculated automatically.
2. **Canvas** — a separate React + tldraw drawing surface, mounted at `/canvas`.
   Its drawing is saved server-side (`GET`/`PUT /api/canvas`, backed by
   `canvas.db`) so the same canvas shows up on any device, not just the
   browser that drew it.
3. **Notes** — record a voice note in the browser; the server transcribes it
   (Groq's Whisper API), re-encodes it to a small mono file (ffmpeg), and
   stores the compressed audio in Tigris object storage plus the transcript
   in SQLite (`notes.db`). The original high-quality upload is never kept.
4. **Messaging Channel (Telegram)** — connect Telegram via deep-linking;
   send voice notes directly to the Telegram bot to have them transcribed
   and stored into `notes.db` like web notes, or receive messages from the
   server (`send_to_user`). State and links live in SQLite (`channels.db`).

It is deployed to **Fly.io**, and the deploy runs automatically from GitHub
Actions on every push to `main`.

- **Repo:** https://github.com/Specterr07/applewatchtriggers
- **Live app:** https://applewatchtriggers.fly.dev

---

## Top-level files and folders

| Path | What it is | Why it exists |
| --- | --- | --- |
| `app.py` | Just app wiring: creates the Flask app, sets up Swagger docs, registers the blueprints below, and the 404 handler. No routes or storage logic live here anymore. | Kept intentionally tiny (~50 lines) so it's obvious at a glance what the app is made of. |
| `routes/` | One file per feature's HTTP routes: `tasks.py` (`/toggle`, `/status`, `/api/logs*`), `canvas.py` (`/api/canvas`, GET/PUT), `notes.py` (`/api/notes*`), `telegram.py` (`/telegram/webhook`, `/api/channels/telegram/link`, `/api/channels/test`), `pages.py` (`/`, `/canvas`, `/canvas/assets/<file>`). | Each route file only parses the request, calls into `services/`, and shapes the JSON response - no file/database code mixed in. |
| `services/` | Storage and cross-cutting logic the routes call into: `tasks_db.py` (SQLite CRUD for tasks), `canvas_db.py` (SQLite for the canvas's single saved snapshot), `notes_db.py` (SQLite for note metadata), `channels_db.py` (SQLite for Telegram links, one-time codes, seen updates), `channels.py` (channel abstraction & `send_to_user`), `telegram.py` (Telegram Bot API wrapper), `note_pipeline.py` (shared audio note ingest pipeline), `object_storage.py` (Tigris via boto3 - upload/delete/presigned playback URLs), `audio_compression.py` (ffmpeg re-encode), `transcription.py` (Groq Whisper), `auth.py` (the `require_key` decorator), `time.py` (`local_now()`/`TIMEZONE`), `config.py` (`DATA_DIR`). | Keeps file/database/external-API code out of the route files, and means the same storage/service functions aren't duplicated across routes that need them. |
| `requirements.txt` | Python dependencies (`Flask`, `flask-swagger-ui`, `tzdata`, `groq`, `boto3`). `gunicorn` is installed separately in the Dockerfile for production. | Keeps the backend install minimal. `tzdata` ensures `zoneinfo` can find timezone data even on the slim base image, which doesn't reliably ship its own; `groq`/`boto3` are the Notes feature's transcription and Tigris clients. |
| `static/` | A **plain HTML/CSS/JS** webpage — the login screen, Time Log view, and Notes tab, all in one file (`static/index.html`). Also holds `openapi.yaml`. | **No build step, no npm, no framework.** Flask serves this folder directly. Kept dependency-free on purpose so the main webpage stays trivial to edit and deploy. See "Why static/ and frontend/ are split" below. |
| `static/index.html` | The actual webpage — inline `<style>` and inline `<script>`, talks to the API with `fetch`. | Single self-contained file; nothing to compile. |
| `static/openapi.yaml` | The OpenAPI 3 contract for the API. Flask serves it at `/static/openapi.yaml`, and `flask-swagger-ui` renders it as browsable docs at `/docs`. | This is the file a frontend engineer reads to build against the API without opening `app.py`. |
| `frontend/` | A **separate** React + Vite + **tldraw** app — the `/canvas` feature only. Requires npm and a build step. Contains: `index.html` (Vite entry), `main.tsx` (mounts React into `#root`), `App.tsx` (the tldraw canvas - loads its snapshot from `GET /api/canvas` on mount, debounce-saves via `PUT /api/canvas` a few seconds after each edit, plus the "Back to Task Logger" link), `vite-env.d.ts` (Vite ambient types), `package.json` / `package-lock.json`, `vite.config.ts` (`base: '/canvas/'`), and `tsconfig*.json`. | tldraw ships as a React SDK, so this part genuinely needs a bundler. It is built in an isolated Docker stage and only its compiled output is copied into the final image. See "Why static/ and frontend/ are split" below. |
| `Dockerfile` | **Multi-stage build.** Stage 1 (`node:20-slim`) runs `npm install` + `npm run build` on `frontend/` and produces `frontend/dist`. Stage 2 (`python:3.12-slim`) `apt-get install`s `ffmpeg`, installs Python deps, copies `app.py`, `routes/`, `services/`, `static/`, and **only** `frontend/dist` (as `canvas_dist/`), then runs gunicorn (`--timeout 120`, longer than the 30s default - `POST /api/notes` does upload + transcription + compression + a Tigris upload in one request). | Node and npm never reach the production image — only the compiled canvas JS/CSS does. This is why `frontend/` can have heavy build tooling without bloating the deployed app. `ffmpeg` isn't in `python:3.12-slim` by default, so Notes needs it installed explicitly. |
| `fly.toml` | Fly.io app config: app name, region (`sin`), the persistent volume mounted at `/data`, `DATA_DIR=/data`, `TIMEZONE=Asia/Kolkata`, and the HTTP service on port 8080. Does **not** list `GROQ_API_KEY` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_ENDPOINT_URL_S3` / `BUCKET_NAME` - those are Fly secrets (`fly secrets set ...`), kept out of this (git-tracked) file the same way `API_KEY` already is. | `tasks.db`, `canvas.db`, and `notes.db` all live on the Fly volume (`/data`), **not** in the image or git, so data survives redeploys. `TIMEZONE` fixes timestamps to your local time regardless of the container's own (UTC) clock. |
| `.github/workflows/deploy.yml` | GitHub Actions workflow: on push to `main`, install `flyctl`, run `flyctl deploy --remote-only`. Uses the `FLY_API_TOKEN` secret. | Automates what used to be a manual `fly deploy`. |
| `.gitignore` | Excludes every `*.db` file (`tasks.db`/`canvas.db`/`notes.db` - real data, only ever meant to live on the Fly volume), Python caches, `.venv/`, editor folders, `.env`, and the generated frontend output (`frontend/node_modules/`, `frontend/dist/`, `*.tsbuildinfo`, `canvas_dist/`). | Everything listed is either a local/build artifact or real runtime data - neither belongs in git. |
| `CLAUDE.md` | Standing instructions for Claude Code working in this repo: keep this file (`PROJECT_STRUCTURE.md`) in sync with any change that adds/removes/restructures a file/folder/route/service/database, as part of that same change; plus a workaround for a local-preview tooling quirk unrelated to this app's own code. | So an out-of-date structure doc gets caught and fixed immediately, and so a fresh session doesn't waste time rediscovering a known tooling gotcha. |
| `GEMINI.md` | A symlink to `CLAUDE.md` so that Antigravity agents automatically discover and follow the exact same standing project instructions as Claude. | Ensures consistency across different AI assistants without maintaining duplicate rule files. |
| `ARCHITECTURE.md` | A Mermaid diagram + written summary of what's actually deployed right now (build pipeline, Flask blueprints, the three SQLite databases, Tigris/Groq, both clients) - verified against the real code, not memory. | A single "how does this all fit together, and why" reference, separate from this file's per-path table. |
| `docs/plans/` | One file per feature: `PLAN_NAMED_TASKS_BENTO_CARDS.md`, `PLAN_CANVAS_SAVE.md`, `PLAN_VOICE_NOTES.md` (all three shipped - written up retroactively as a decision record), `PLAN_MULTI_USER.md` and `PLAN_LLM_REMINDERS.md` (not built yet - capture what's actually decided vs. still an open question, without guessing at the gaps). | A durable record of *why* a feature looks the way it does, and - for what's still ahead - what's actually settled vs. still needs deciding. |
| `docs/` | `PROCESS.md` (the 3-step Think → Draw → Build process), `STANDARDS.md` (naming/file conventions), and `features/` (one file per feature, plus `_template.md`). | Organizes all structural plans, feature docs, and codebase conventions in one place. |
| `TODO.md` | The consolidated future-work list, grouped into what's ready to build, open questions, and what's explicitly deferred (the multi-user pivot) - built from the `docs/plans/` files above. | One place to see what's next without re-reading every plan file. |
| `FUTURE_ARCHITECTURE.md` | A second Mermaid diagram showing what `ARCHITECTURE.md` becomes after the multi-user pivot, color-coded: decided, genuinely undecided, and removed (Apple Push). Speculative, not a build plan - the pivot itself is deferred. | Makes the gaps in the multi-user plan visible without pretending they're resolved. |
| `.dockerignore` | Keeps `node_modules/`, `dist/`, `canvas_dist/`, `.venv/`, `.git/`, `.github/`, and `*.db` out of the Docker build context. | Stops a macOS-built `node_modules` from being copied over the container's fresh Linux `npm install` (which would break native binaries), and keeps the image small and free of real data files. |
| `.venv/` | Local Python virtual environment. | Local only — gitignored, never deployed (the Docker image builds its own environment). |
| `.claude/launch.json` | Tells the Claude Code browser-preview tool how to start this app locally: `.venv/bin/python -m flask --app app run --port 8080 --debug`. | Lets `preview_start` (used during development in this tool) launch the right process by name instead of guessing. Committed to git - it's project config, not a personal/local setting. |

---

## Why `static/` and `frontend/` are split (and stay split)

They solve different problems and have opposite constraints:

| | `static/` | `frontend/` |
| --- | --- | --- |
| **What** | Time Log + Notes webpage | tldraw canvas (`/canvas`) |
| **Tech** | Hand-written HTML/CSS/JS | React 19 + Vite + tldraw |
| **Build step** | **None** | `npm install` + `vite build` |
| **How it's served** | Flask serves the folder as-is | Flask serves the **compiled** `dist/` output (copied in as `canvas_dist/`) |
| **In the Docker image** | Copied verbatim | Only the build output is copied; Node/npm are discarded with Stage 1 |

Keeping the main webpage in `static/` means the part of the app that changes
most often has **zero toolchain** — edit the file, refresh, deploy. tldraw
*cannot* be used that way (it's a React SDK that must be bundled), so it lives
in its own folder with its own `package.json` and is built in isolation.

Merging them would force a build step onto the dependency-free webpage, or
force the canvas to abandon its SDK. Neither is wanted — **do not merge them.**

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
transcript, the object's key, and a timestamp. `GET /api/notes` mints a
fresh presigned playback URL for each note on every request rather than
storing a permanent one, since a stored URL would just be a presigned
link quietly expiring later - the object key is the only part that's
actually stable.

Needs `GROQ_API_KEY` (transcription) and `AWS_ACCESS_KEY_ID` /
`AWS_SECRET_ACCESS_KEY` / `AWS_ENDPOINT_URL_S3` / `BUCKET_NAME` (Tigris)
set as env vars to fully work - without them, recording still runs
client-side but saving a note fails with a clear error instead of a
silent one.

---

## Channels: Telegram bot integration & channels.db

Messaging integrations store their channel link states, one-time verification
pairing codes, and processed webhook update IDs in SQLite (`channels.db`).
Incoming voice notes from Telegram are downloaded, passed through the shared
`services/note_pipeline.py` pipeline (Groq transcription + ffmpeg compression
+ Tigris upload), and stored into `notes.db`.

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

Serves the webpage at `/`, the API at `/toggle` `/status` `/api/...`, and the
docs at `/docs`. The `/canvas` route needs the compiled canvas present as
`canvas_dist/` next to `app.py` (see below).

**Canvas (local):**

```
cd frontend && npm install && npm run build      # produces frontend/dist/
cp -R frontend/dist ../canvas_dist               # so Flask's /canvas route can find it
```

**Production:** `docker build` does both automatically — Stage 1 builds
`frontend/` and Stage 2 copies `frontend/dist` in as `canvas_dist/`. The Vite
`base: '/canvas/'` setting makes the built asset URLs line up exactly with
Flask's `/canvas/assets/<file>` route, so no path config is needed at runtime.
