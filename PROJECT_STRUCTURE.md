# Project Structure — task-logger

A small **Flask** app that does three things:

1. **Time Log** — an Apple Watch Shortcut (and the webpage) hits `/toggle` to
   log Start/End events into a CSV, with durations calculated automatically.
2. **Planner** — a simple day planner (add / edit / complete / delete items),
   also stored in a CSV.
3. **Canvas** — a separate React + tldraw drawing surface, mounted at `/canvas`.

It is deployed to **Fly.io**, and the deploy runs automatically from GitHub
Actions on every push to `main`.

---

## Top-level files and folders

| Path | What it is | Why it exists |
| --- | --- | --- |
| `app.py` | The entire Flask backend: API-key check, the `/toggle` + `/status` time-log endpoints, the `/api/logs` history endpoint, the `/api/planner` CRUD endpoints, and the routes that serve the webpage (`/`) and the compiled canvas (`/canvas`). | This is the whole server. It reads/writes two CSV files and serves two frontends. There is no database — CSVs are intentionally simple and can be opened in Excel. |
| `requirements.txt` | Python dependencies (`Flask`, `flask-swagger-ui`). `gunicorn` is installed separately in the Dockerfile for production. | Keeps the backend install minimal. |
| `static/` | A **plain HTML/CSS/JS** webpage — the login screen, Time Log view, and Planner, all in one file (`static/index.html`). Also holds `openapi.yaml`. | **No build step, no npm, no framework.** Flask serves this folder directly. Kept dependency-free on purpose so the main webpage stays trivial to edit and deploy. See "Why static/ and frontend/ are split" below. |
| `static/index.html` | The actual webpage — inline `<style>` and inline `<script>`, talks to the API with `fetch`. | Single self-contained file; nothing to compile. |
| `static/openapi.yaml` | The OpenAPI 3 contract for the API. Flask serves it at `/static/openapi.yaml`, and `flask-swagger-ui` renders it as browsable docs at `/docs`. | This is the file a frontend engineer reads to build against the API without opening `app.py`. |
| `frontend/` | A **separate** React + Vite + **tldraw** app — the `/canvas` feature only. Requires npm and a build step. Contains: `index.html` (Vite entry), `main.tsx` (mounts React into `#root`), `App.tsx` (the tldraw canvas + "Back to Task Logger" link), `vite-env.d.ts` (Vite ambient types), `package.json` / `package-lock.json`, `vite.config.ts` (`base: '/canvas/'`), and `tsconfig*.json`. | tldraw ships as a React SDK, so this part genuinely needs a bundler. It is built in an isolated Docker stage and only its compiled output is copied into the final image. See "Why static/ and frontend/ are split" below. |
| `Dockerfile` | **Multi-stage build.** Stage 1 (`node:20-slim`) runs `npm install` + `npm run build` on `frontend/` and produces `frontend/dist`. Stage 2 (`python:3.12-slim`) installs Python deps, copies `app.py`, `static/`, and **only** `frontend/dist` (as `canvas_dist/`), then runs gunicorn. | Node and npm never reach the production image — only the compiled canvas JS/CSS does. This is why `frontend/` can have heavy build tooling without bloating the deployed app. |
| `fly.toml` | Fly.io app config: app name, region (`sin`), the persistent volume mounted at `/data`, `DATA_DIR=/data`, and the HTTP service on port 8080. | The CSV files live on the Fly volume (`/data`), **not** in the image or git, so data survives redeploys. |
| `.github/workflows/deploy.yml` | GitHub Actions workflow: on push to `main`, install `flyctl`, run `flyctl deploy --remote-only`. Uses the `FLY_API_TOKEN` secret. | Automates what used to be a manual `fly deploy`. |
| `.gitignore` | Excludes the data CSVs, Python caches, `.venv/`, editor folders, `.env`, and the generated frontend output (`frontend/node_modules/`, `frontend/dist/`, `canvas_dist/`). | The CSVs are runtime data on the Fly volume; everything else listed is a local or build artifact. |
| `TODO.md` | *Not currently present in the repo.* | Referenced as a planned scratch list of pending work; add it at the root if you want one tracked. |
| `.dockerignore` | Keeps `node_modules/`, `dist/`, `.venv/`, `.git/`, and the data CSVs out of the Docker build context. | Stops a macOS-built `node_modules` from being copied over the container's fresh Linux `npm install` (which would break native binaries), and keeps the image small. |
| `.venv/` | Local Python virtual environment. | Local only — gitignored, never deployed (the Docker image builds its own environment). |

---

## Why `static/` and `frontend/` are split (and stay split)

They solve different problems and have opposite constraints:

| | `static/` | `frontend/` |
| --- | --- | --- |
| **What** | Time Log + Planner webpage | tldraw canvas (`/canvas`) |
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
