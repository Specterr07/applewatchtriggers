# Agent handoff - start here

**Last updated:** 2026-10-04 (after PR #6; titles deployed and backfilled).

This is the first file an AI agent (Claude, Antigravity/Gemini, anything
else) should read when it starts working on this repo. It tells you where
things stand and where to look. **Don't rely on earlier chat context -
the repo is the source of truth.** If something here disagrees with the
code, the code wins: fix this file.

---

## 1. What Sheev is, in 30 seconds

A personal tool Vivek uses every day, built incrementally
(experiment → learn → add → remove → repeat). Flask API + React app,
deployed to Fly.io (`applewatchtriggers.fly.dev`) from GitHub Actions on
every push to `main`.

- **Main job - voice notes.** Record in the web app or send a voice note
  to the Telegram bot → Groq Whisper transcribes it → Groq
  `openai/gpt-oss-20b` gives it a short title → ffmpeg compresses the
  audio → audio in Tigris, transcript + title in `notes.db`. Home is
  notes-first.
- **Second job - time tracking.** An Apple Watch Shortcut (one tap,
  `GET /toggle`) or the web app starts/stops a task (`tasks.db`).
- **Side tool - canvas.** A tldraw canvas saved server-side.
- **Single user, by design.** One shared `API_KEY`; multi-user accounts
  are not on the roadmap.

## 2. Reading order

1. **This file.**
2. **`TODO.md`** - the roadmap & backlog: shipped, now, next, bugs,
   ideas, dropped. Pick work from here.
3. **`CLAUDE.md`** - standing rules (feature process, keep docs in sync).
4. **`PROJECT_STRUCTURE.md`** - what every file/folder/route is for.
5. **`ARCHITECTURE.md`** - how the deployed pieces fit together.
6. The feature file for whatever you're working on, in `docs/features/`
   (newer, follows `docs/PROCESS.md`) or `docs/plans/` (older records).

## 3. Where things stand

| Area | State | File |
|---|---|---|
| Voice notes, Telegram, tasks, canvas | ✅ Shipped, in daily use | `docs/plans/*`, `docs/features/messaging-channel.md` |
| Notes-first Home + AI titles | ✅ Shipped 2026-10-04, backfill done | `docs/features/notes-first-ai-titles.md` |
| Frontend redesign | Built, merged and live at `/`; **UI/UX and canvas signed off 2026-10-04** (desktop + iPhone). Bundle and Lighthouse checks passed (Performance 97, Accessibility 100). Only `static/index.html` deletion left | `docs/features/frontend-redesign.md` (Status block at top) |
| Wrap-up for portfolio | README + MIT license done (2026-10-04). Left: 401 bug fix, security review, Loom video | `TODO.md` §1 |

## 4. Rules that matter most

- **No code for a new feature until its file says 🔒 Locked**
  (`docs/PROCESS.md`). Bug fixes, small tweaks and docs don't need this.
- **Keep the docs in sync in the same change:** `PROJECT_STRUCTURE.md`
  for any file/route/service/database change; `TODO.md` when an item is
  done, added or dropped; this file's §3 table when an area changes state.
- **Frozen contracts - never change these:**
  - `GET /toggle[?name=]` → `{ok, action, id, message}` and
    `GET /status` → `{ok, next_action}`, with `?key=` or `X-API-Key`.
    The Watch Shortcut depends on them and can't be updated with a deploy.
    Pinned by `tests/test_watch_contract.py`.
  - localStorage keys `task_logger_api_key` and
    `task_logger_session_last_active` (24h sliding expiry).
  - Unknown URLs (incl. unknown `/api/*`) return the JSON 404; only the
    explicit page list in `routes/pages.py` returns HTML.
- **Timestamps** are timezone-less `YYYY-MM-DD HH:MM:SS` strings in
  `Asia/Kolkata`. In the frontend, parse only via `src/utils/time.ts`,
  never `new Date(string)`. `SERVER_TIMEZONE` (frontend) must match
  `TIMEZONE` in `fly.toml`.
- **No `fetch` outside `frontend/src/api/`.**
- **Titling never blocks a note save** - `generate_title()` returns `None`
  on failure and logs it with a `[titling]` prefix.
- **Keep it simple and explained.** Vivek doesn't want to build things he
  doesn't understand: prefer plain solutions, explain the why, avoid new
  dependencies unless they clearly earn their place.

## 5. Running and checking things

```
.venv/bin/python -m flask --app app run --port 8080 --debug   # backend
cd frontend && npm run dev                                     # frontend (proxies to :8080)
.venv/bin/python -m pytest                                     # backend tests
cd frontend && npm test && npm run build && npm run lint       # frontend checks
```

CI (`.github/workflows/deploy.yml`) runs all of these on every PR and push
to `main`; deploys only happen if they pass. Last recorded counts
(2026-10-03): **pytest 47 passed, vitest 66 passed**, build + lint clean.

Useful production commands: `fly logs` (look for `[titling]`),
`fly ssh console -C "python scripts/backfill_note_titles.py"` (safe to
re-run).

## 6. Working setup

- Vivek works on a MacBook Air M1 (his only machine) with AI agents.
  No local Docker - Fly's remote builder does the Docker build.
- Branch per change, PR into `main`, merge → auto-deploy.
- Secrets live in Fly (`fly secrets set`), never in git: `API_KEY`,
  `GROQ_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
  `AWS_ENDPOINT_URL_S3`, `BUCKET_NAME`, `TELEGRAM_BOT_TOKEN`,
  `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`.
