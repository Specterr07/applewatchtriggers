# Project Standards & Conventions

This document outlines the naming conventions, file system structure, and coding standards used across the Apple Watch Triggers project. Consistency is key to keeping the codebase organized and maintainable.

## 1. Naming Conventions

### Python (Backend)
- **Files/Modules:** `snake_case` (e.g., `tasks_db.py`, `audio_compression.py`)
- **Functions & Variables:** `snake_case` (e.g., `get_all_tasks()`, `total_duration`)
- **Classes:** `PascalCase` (e.g., `TaskLog`, `CanvasSnapshot`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `DATA_DIR`, `TIMEZONE`)

### TypeScript / React (Frontend)
- **Files (Components):** `PascalCase` (e.g., `App.tsx`, `TaskBoard.tsx`)
- **Files (Hooks/Utils):** `camelCase` (e.g., `useFetchTasks.ts`, `api.ts`)
- **React Components:** `PascalCase` (e.g., `function TaskCard() { ... }`)
- **Functions & Variables:** `camelCase` (e.g., `saveCanvas()`, `isLoading`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_ATTEMPTS`)

### SQLite Databases
- **Database Files:** `snake_case` (e.g., `tasks.db`, `canvas.db`)
- **Table Names:** `snake_case`, pluralized (e.g., `tasks`, `notes`, `snapshots`)
- **Column Names:** `snake_case` (e.g., `created_at`, `task_name`)

## 2. File System Standard

Our root directory maintains a strict separation of concerns to avoid clutter:

- `backend/` *(conceptually the root Python files)*: Kept at the root to avoid nested Docker/Fly configurations. Includes `app.py`, `routes/`, and `services/`.
- `frontend/`: The React + TypeScript + Vite app (served at `/`; built assets at `/app/assets/*`). Built completely separately via Docker Stage 1. No backend dependencies. Folder layout and rules: `docs/features/frontend-redesign.md` §8.
- `static/`: `openapi.yaml`, plus the old webpage file (`index.html`), no longer served at `/` and pending deletion.
- `docs/`: All documentation, planning records, and architectural diagrams.
  - `docs/plans/`: Historical `PLAN_*.md` decision records for implemented and deferred features.
  - `docs/features/`: Work-in-progress or proposed feature definitions (following `PROCESS.md`).

## 3. General Principles
- **Keep route handlers lean:** `routes/*.py` should only handle request parsing, calling services, and returning JSON. All database/external logic belongs in `services/`.
- **One frontend going forward:** New UI work goes in the React app (`frontend/`), not in `static/index.html`, which no longer serves `/` and is pending deletion. (This replaces the earlier "keep static/ and frontend/ separate" rule - see the Decisions in `docs/features/frontend-redesign.md`.)
- **Update Documentation Synchronously:** Any structural changes to routes, DB schemas, or folders must include parallel updates to `PROJECT_STRUCTURE.md`.
