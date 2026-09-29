# Claude Code handoff — frontend redesign

**Status (2026-09-30):** Phases 2–5 of the frontend redesign are complete and
committed. Next is Phase 6 (Apple Watch + integrations/settings) — **do not
start it without the user's explicit approval.**

> **Next session: inspect the repository first.** Don't rely on earlier chat
> context. Read, in order: this file → `docs/features/frontend-redesign.md`
> (the locked spec, source of truth) → `PROJECT_STRUCTURE.md` →
> `ARCHITECTURE.md` → `CLAUDE.md` / `docs/PROCESS.md` → the code in
> `frontend/src/`.

## Phases
| Phase | Scope | State |
|---|---|---|
| M0 | pytest contract/routing tests (`tests/`) + CI gate in `deploy.yml` | Done — CI gate not yet seen running on GitHub |
| 2 | App shell, design system, auth gate, routing, lazy canvas | Done |
| 3 | Home / Overview, Capture, guarded Start/Stop | Done |
| 4 | Tasks + Time Log, task detail/edit/reopen/delete | Done |
| 5 | Notes + voice recording, playback, delete | Done |
| 6 | Apple Watch screen, Telegram screen, full Settings | Not started |
| 7 | Canvas visual review | Not started |
| 8–10 | Real-time UX, polish (shortcuts, perf/a11y audit), demo | Not started |
| M5 | Cutover: React app to `/`, delete `static/index.html` | Not started |

Each phase ends with a STOP for the user's review (spec §10, "Review checkpoints").

## Current architecture
- Flask (unchanged API) serves the old page at `/` and the React app at
  `/app/*` (`routes/pages.py`, explicit route list; JSON 404 elsewhere).
  `/canvas` → 302 `/app/canvas`.
- React 19 + TS + Vite + Tailwind v4 in `frontend/`; build copied to
  `web_dist/` by the Dockerfile. `ROUTER_BASENAME = '/app'` in `src/config.ts`.
- All network access in `src/api/`; server state via React Query
  (`['tasks']`, `['notes']`); cache cleared on sign-out.
- Home, Tasks, Time Log share one task cache; minutes computed once
  (`src/utils/tasks.ts`). Timestamps are timezone-less server strings —
  parse only via `src/utils/time.ts`, never `new Date(string)`.
- Recorder: `features/notes/recorderController.ts` (state machine) wrapped
  by `RecorderProvider` inside `AppShell`.

## API contracts that must not change
- `GET /toggle[?name=]` → `{ok, action, id, message}` and `GET /status` →
  `{ok, next_action}`; `?key=` query param or `X-API-Key` header. Used by the
  Apple Watch Shortcut. Pinned by `tests/test_watch_contract.py`.
- `/api/logs`, `/api/logs/<id>` (GET/PATCH/DELETE), `/api/notes` (GET/POST
  multipart `audio`), `/api/notes/<id>` (DELETE), `/api/canvas` (GET/PUT),
  `/api/channels/*` — see `static/openapi.yaml`.
- localStorage keys `task_logger_api_key`, `task_logger_session_last_active`
  (shared with the old page). New: `sheev_theme`.

## Design decisions (see spec "Decisions")
- Start/Stop always checks `/status` before `/toggle`; Stop never sends a name.
- `--danger-strong` = filled destructive button; `--danger-text` = red
  text/icons/borders. Light default, dark supported, WCAG AA tokens.
- Tasks sorted by start time; task/note detail read from the shared cache.
- Time Log defaults to 7 days; Home/Time Log refetch every 60s while visible.
- **Notes desktop deviation:** note detail uses the task-style drawer on
  tablet/desktop instead of spec §5.2's two-pane layout (user-approved).
- Reopen shows a warning that it continues the original session.

## Known issues / outstanding work
- **Docker build not verified** locally (daemon was off); lockfile has Linux bindings.
- **CI gate:** `.github/workflows/deploy.yml` now runs pytest + frontend lint/test/build before deploying; confirm the first run on GitHub is green.
- Primary-button hover fades to ~4.2:1 contrast in light mode.
- React Query `staleTime` 15s: user saw focus-driven refetches every ~18s; raising to 60s is an open question.
- A 401 during a voice-note upload signs out and the recording is lost.
- Groq/Tigris success paths were only verified with a scratch stub harness.

## Validation at handoff
pytest 27 passed · Vitest 46 passed · typecheck/lint clean · initial JS 172.7 KB gzipped (budget 250 KB).
Run: `.venv/bin/python -m pytest` and `cd frontend && npm test && npm run build && npm run lint`.
