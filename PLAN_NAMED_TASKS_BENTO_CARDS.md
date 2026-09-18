# Plan: Named Tasks + Bento Cards + Detail Page

**Status: Shipped.** Backend in commit `749f456`, frontend/branding in
commit `a7b319e`. Written up here retroactively as a record of what was
decided, since it didn't exist as a file until now.

**Goal:** support a bento-card view of logged tasks (title, date, time
spent) that opens into a per-task detail page on click - Nike Run Club
style.

## Decisions

1. **Task naming - how a name gets attached.** The Watch stays one-tap,
   zero friction - no naming from the Watch, ever. `/toggle`'s `name`
   field is optional and the Watch never sends it. The webpage is the
   only place a task ever gets named: either at Start/End time from its
   own button, or retroactively via the detail page.
2. **Storage.** Migrate `tasks.csv` to SQLite (`tasks.db`) - not
   `planner.csv`, since the only reason for the migration was needing
   stable ids for cards/detail-pages, and the planner didn't need that
   (the planner was later removed entirely - see git history, not part
   of this plan).
3. **Generic title format** (when no name is given):
   `"Task – <weekday>, <time>"`, e.g. `"Task – Fri, 9:00 AM"`.
4. **Existing data in tasks.csv:** not migrated - it was test data.
   `tasks.db` started empty.
5. **Delete/edit from the webpage:** `PATCH /api/logs/<id>` (edit any
   subset of `name`/`start`/`end`, recalculating `duration_minutes`
   server-side if a time changed) and `DELETE /api/logs/<id>`, mirroring
   the pattern already used for planner items at the time.

### Backend
- `tasks.db`, table `tasks`: `id (int, auto), name (text, nullable),
  start (datetime), end (datetime, nullable), duration_minutes (float,
  nullable)`.
- `/toggle` - same Start/End toggle logic, now reading/writing SQLite.
  Webpage's own Start/End call may optionally include `name`.
- `GET /api/logs` - `id, name (or generic title), date, start, end,
  duration_minutes` per task.
- `GET /api/logs/<id>` - full detail for one task.
- `PATCH /api/logs/<id>` / `DELETE /api/logs/<id>` as above.

### Frontend (`static/index.html` - same file, no new build tooling)
- Bento grid replaces the plain session list in the Time Log tab:
  fetch `GET /api/logs` on tab load, one card per task (title, date,
  time range, duration as the prominent stat), responsive CSS grid,
  whole card clickable → detail view.
- Task detail: an **in-page panel, not a real route** - consistent with
  how `showTab()` already worked, and there's no need to link/share a
  single task externally. Editable title, date, start, end, duration;
  **Save** (`PATCH` with whatever changed) and **Delete** (`DELETE`,
  confirms first); **Back** returns without saving.
- `<input type="datetime-local">` for start/end, converted to the
  backend's `YYYY-MM-DD HH:MM:SS` format.
- Branding introduced in this pass: app name "Sheev", tagline "Let's
  get it done!", in the page `<title>`, header, and login screen; the
  Swagger docs title too (low priority).

**Explicitly not in this pass:** `/canvas` and the Planner tab were
untouched; no routing/URLs per task.
