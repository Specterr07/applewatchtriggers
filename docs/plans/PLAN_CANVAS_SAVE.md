# Plan: Server-Side Canvas Persistence

**Status: Shipped.** Commit `a8ecf2e`. Written up here retroactively.

**Goal:** the tldraw canvas (`frontend/`) was stuck in one browser's local
storage via tldraw's `persistenceKey`. Make the same canvas available
across devices instead.

## Decisions

- New `services/canvas_db.py`, a separate SQLite file (`canvas.db`,
  matching the existing `tasks_db.py` per-feature-database pattern),
  storing a **single row** with the canvas's serialized snapshot as
  JSON plus an `updated_at` timestamp.
- New `routes/canvas.py`: `GET /api/canvas` and `PUT /api/canvas`, both
  behind the existing `require_key` auth decorator.
- `frontend/App.tsx` (the plan named `frontend/src/App.tsx`, but this
  repo's file has always been at `frontend/App.tsx` - no `src/` dir;
  edited the real path): load the snapshot from `GET /api/canvas` on
  mount, debounce-save changes via `PUT /api/canvas` a few seconds
  after the last edit, replacing the `persistenceKey`-only approach.
- The canvas app reads the same `X-API-Key` value the main page already
  stores in `localStorage` (same origin, so it's shared - no separate
  login needed for `/canvas`).

### What actually got built (beyond the letter of the plan)
- A loading overlay and an error state with a **Retry** button while
  the canvas loads - not explicitly asked for, but the same
  "don't leave the user stuck" principle the Notes plan later asked for
  explicitly.
- `store.listen(..., { source: 'user', scope: 'document' })` specifically
  (not every store change) so camera pan/zoom doesn't trigger a save.
- A flush-on-tab-hide save, so closing the tab within the debounce
  window doesn't lose the last few seconds of edits.
- `AUTOINCREMENT`-free single-row schema (`id INTEGER PRIMARY KEY
  CHECK (id = 1)`) enforcing "only ever one canvas" at the database
  level.
