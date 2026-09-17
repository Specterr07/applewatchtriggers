# Project Structure — task-logger

A small **Flask** app that does two things:

1. **Time Log** — an Apple Watch Shortcut (and the webpage) hits `/toggle` to
   start/end a task, stored as one row per task in SQLite (`tasks.db`) so
   every task has a stable id - what a bento-card grid and a per-task detail
   page link to. Durations are calculated automatically.
2. **Canvas** — a separate React + tldraw drawing surface, mounted at `/canvas`.

It is deployed to **Fly.io**, and the deploy runs automatically from GitHub
Actions on every push to `main`.

---

## Top-level files and folders

| Path | What it is | Why it exists |
| --- | --- | --- |
| `app.py` | Just app wiring: creates the Flask app, sets up Swagger docs, registers the blueprints below, and the 404 handler. No routes or storage logic live here anymore. | Kept intentionally tiny (~50 lines) so it's obvious at a glance what the app is made of. |
| `routes/` | One file per feature's HTTP routes: `tasks.py` (`/toggle`, `/status`, `/api/logs*`), `pages.py` (`/`, `/canvas`, `/canvas/assets/<file>`). | Each route file only parses the request, calls into `services/`, and shapes the JSON response - no file/database code mixed in. |
| `services/` | Storage and cross-cutting logic the routes call into: `tasks_db.py` (SQLite CRUD for tasks), `auth.py` (the `require_key` decorator), `time.py` (`local_now()`/`TIMEZONE`), `config.py` (`DATA_DIR`). | Keeps file/database access out of the route files, and means the same storage functions aren't duplicated across routes that need them. |
| `requirements.txt` | Python dependencies (`Flask`, `flask-swagger-ui`, `tzdata`). `gunicorn` is installed separately in the Dockerfile for production. | Keeps the backend install minimal. `tzdata` ensures `zoneinfo` can find timezone data even on the slim base image, which doesn't reliably ship its own. |
| `static/` | A **plain HTML/CSS/JS** webpage — the login screen and Time Log view, all in one file (`static/index.html`). Also holds `openapi.yaml`. | **No build step, no npm, no framework.** Flask serves this folder directly. Kept dependency-free on purpose so the main webpage stays trivial to edit and deploy. See "Why static/ and frontend/ are split" below. |
| `static/index.html` | The actual webpage — inline `<style>` and inline `<script>`, talks to the API with `fetch`. | Single self-contained file; nothing to compile. |
| `static/openapi.yaml` | The OpenAPI 3 contract for the API. Flask serves it at `/static/openapi.yaml`, and `flask-swagger-ui` renders it as browsable docs at `/docs`. | This is the file a frontend engineer reads to build against the API without opening `app.py`. |
| `frontend/` | A **separate** React + Vite + **tldraw** app — the `/canvas` feature only. Requires npm and a build step. Contains: `index.html` (Vite entry), `main.tsx` (mounts React into `#root`), `App.tsx` (the tldraw canvas + "Back to Task Logger" link), `vite-env.d.ts` (Vite ambient types), `package.json` / `package-lock.json`, `vite.config.ts` (`base: '/canvas/'`), and `tsconfig*.json`. | tldraw ships as a React SDK, so this part genuinely needs a bundler. It is built in an isolated Docker stage and only its compiled output is copied into the final image. See "Why static/ and frontend/ are split" below. |
| `Dockerfile` | **Multi-stage build.** Stage 1 (`node:20-slim`) runs `npm install` + `npm run build` on `frontend/` and produces `frontend/dist`. Stage 2 (`python:3.12-slim`) installs Python deps, copies `app.py`, `routes/`, `services/`, `static/`, and **only** `frontend/dist` (as `canvas_dist/`), then runs gunicorn. | Node and npm never reach the production image — only the compiled canvas JS/CSS does. This is why `frontend/` can have heavy build tooling without bloating the deployed app. |
| `fly.toml` | Fly.io app config: app name, region (`sin`), the persistent volume mounted at `/data`, `DATA_DIR=/data`, `TIMEZONE=Asia/Kolkata`, and the HTTP service on port 8080. | `tasks.db` lives on the Fly volume (`/data`), **not** in the image or git, so data survives redeploys. `TIMEZONE` fixes timestamps to your local time regardless of the container's own (UTC) clock. |
| `.github/workflows/deploy.yml` | GitHub Actions workflow: on push to `main`, install `flyctl`, run `flyctl deploy --remote-only`. Uses the `FLY_API_TOKEN` secret. | Automates what used to be a manual `fly deploy`. |
| `.gitignore` | Excludes the leftover `tasks.csv` (unused now that tasks live in SQLite), Python caches, `.venv/`, editor folders, `.env`, and the generated frontend output (`frontend/node_modules/`, `frontend/dist/`, `canvas_dist/`). | Everything listed is a local or build artifact, not something git should track. |
| `TODO.md` | *Not currently present in the repo.* | Referenced as a planned scratch list of pending work; add it at the root if you want one tracked. |
| `.dockerignore` | Keeps `node_modules/`, `dist/`, `.venv/`, `.git/`, and `tasks.csv` out of the Docker build context. | Stops a macOS-built `node_modules` from being copied over the container's fresh Linux `npm install` (which would break native binaries), and keeps the image small. |
| `.venv/` | Local Python virtual environment. | Local only — gitignored, never deployed (the Docker image builds its own environment). |

---

## Why `static/` and `frontend/` are split (and stay split)

They solve different problems and have opposite constraints:

| | `static/` | `frontend/` |
| --- | --- | --- |
| **What** | Time Log webpage | tldraw canvas (`/canvas`) |
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
not migrated; `tasks.db` started empty. Any leftover `tasks.csv` on disk
is simply unused now.)

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
