# Roadmap & backlog

**Last updated:** 2026-10-04. This is the single list of what's done, what's
next, and what's deliberately not happening. If you're an agent starting a
session, read `docs/claude-handoff.md` first - it tells you how to use this
file.

How items move: anything that's a **new feature** goes through
`docs/PROCESS.md` (Think → Draw → 🔒 Locked → Build) and gets its own file
in `docs/features/`. **Bug fixes, small tweaks and docs** don't need a
feature file - they can be done straight from this list.

---

## Where the project stands (one paragraph)

Sheev is live on Fly.io and used daily. Voice notes are its main job
(record in the web app or send to the Telegram bot → Whisper transcript +
AI title → stored); time tracking (Apple Watch one-tap + web) is the
secondary job; the canvas is a side tool. The frontend redesign has
replaced the old page and is served at `/`. What's left is **finishing
work** (wrap-up for the portfolio, formal sign-off of the redesign, a few
known bugs). No new features are planned right now. The app is
single-user (Vivek only) by design.

---

## ✅ Shipped

| Feature | Record | Shipped |
|---|---|---|
| Named tasks + bento cards + task detail | `docs/plans/PLAN_NAMED_TASKS_BENTO_CARDS.md` | before 2026-09 |
| Server-side canvas persistence | `docs/plans/PLAN_CANVAS_SAVE.md` | before 2026-09 |
| Voice notes (record → transcribe → compress → store) | `docs/plans/PLAN_VOICE_NOTES.md` | before 2026-09 |
| Telegram channel (send voice notes to the server from the phone) | `docs/features/messaging-channel.md` | 2026-09 |
| Frontend redesign, phases M0-M4 + cutover to `/` | `docs/features/frontend-redesign.md` | 2026-09-30 (PRs #1-#4) |
| Notes-first Home + AI note titles (+ backfill) | `docs/features/notes-first-ai-titles.md` | 2026-10-04 (PRs #5, #6) |

---

## 1. Now - wrap-up to make the project portfolio-ready

The goal of this block: Sheev can go on the resume and be shown to
recruiters. Do these in order.

- [ ] **Fix the voice-note 401 bug** (see Known bugs below) - losing a
      recording is the worst thing the app can do to its main feature.
- [ ] **Security review** of the whole app: API-key handling, the
      Telegram webhook secret, presigned URL expiry, secrets in git
      history, CORS/headers, what an unauthenticated visitor can reach.
      Write the findings into a short `docs/SECURITY.md`; fix anything
      serious as bug fixes.
- [ ] **README.md** at the repo root: what Sheev is, a screenshot or GIF,
      the stack, the architecture diagram (link `ARCHITECTURE.md`), how
      to run it locally, how it's deployed. Highlight the
      Whisper + LLM-titling pipeline (using models to build a real
      solution).
- [ ] **LICENSE** - MIT.
- [ ] **Loom walkthrough** (short) - link it from the README.
- [ ] Then: add Sheev to the resume.

## 2. Next - finish and sign off the frontend redesign

All screens are built, merged and working well: Vivek has used the app
on his desktop and iPhone and signed off the UI/UX, canvas included
(2026-10-04), and it passed the bundle and Lighthouse checks. What's left
is removing the old page. Details in `docs/features/frontend-redesign.md` (Status
block at the top, §10 and §13).

- [x] **Parity walk-through** (§13 Parity + New experience): checked in
      daily use on desktop and iPhone against production data.
      *(2026-10-04)*
- [x] **Phase 7 - canvas review** inside the new shell - working fine.
      *(2026-10-04)*
- [x] **Bundle check** (§13 Quality), measured on production
      2026-10-04: initial JS **177 KB gzipped** (200 KB as served by Fly),
      budget 250 KB. tldraw is its own lazy chunk (`CanvasPage-*.js`,
      438 KB gzipped) - not preloaded and not referenced by the main
      bundle except as a dynamic import, so it only loads on `/canvas`.
- [x] **Lighthouse** (mobile, on Home, signed in): **Performance 97,
      Accessibility 100** (targets 85 / 95). Run by Vivek in Chrome
      DevTools, 2026-10-04.
- [ ] **Delete `static/index.html`** - unblocked now that parity is
      signed off (keep `static/openapi.yaml`). Update `PROJECT_STRUCTURE.md`,
      `ARCHITECTURE.md` and `docs/STANDARDS.md` in the same commit.

## 3. Known bugs & small fixes (no feature file needed)

- [ ] **A 401 during a voice-note upload signs you out and the recording
      is lost.** It should keep the recording so it can be retried after
      signing back in. *(highest priority)*
- [ ] **No build version in Settings.** Spec §5.3 asks for the build
      commit, but nothing records one (the Docker context excludes
      `.git`). Needs a build arg passed from CI. See the comment in
      `frontend/src/features/settings/`.
- [ ] **Decide React Query `staleTime`** (`frontend/src/api/queryClient.ts`,
      currently 15s): focus-driven refetches were seen every ~18s; raising
      it to 60s is the open option.
- [ ] **Groq/Tigris success paths were only verified with a stub
      harness** - covered in practice now that notes and titles work in
      production, but there's no automated test for them.
- [ ] **Docker build not verified locally** (no Docker on the Mac). Fly's
      remote builder builds it fine; low priority.

## 4. Ideas - only being thought about

Not on the roadmap. Promote to a feature file only if it becomes a real
plan.

- **Local fallback for transcription and titling.** When Groq is down or
  rate-limited, run a small/moderate model locally on the Mac instead
  (~30-60s per note is acceptable). Not decided how it would connect to
  the Fly server.

## 5. Dropped - don't build these

- **WhatsApp channel** - dropped entirely. Telegram is the only messaging
  channel. (Reason: WhatsApp only allows free messages within 24h of the
  user writing, needs Meta business verification and costs per message -
  see `docs/features/messaging-channel.md`.)
- **Apple Push notifications** - dropped in favour of Telegram.
- **Reminders (LLM tool-calling)** - removed from the roadmap
  2026-10-04. Not planned. If it comes back, plan it from scratch as a
  new `docs/features/` file (the old notes are in git history).
- **Multi-user accounts** - removed from the roadmap 2026-10-04. The app
  stays single-user with one shared `API_KEY`. If it comes back, plan it
  from scratch as a new `docs/features/` file (the old plan and future
  architecture diagram are in git history).
- **Planner** - removed earlier (see git history).
- **Kanban, projects, tags, due dates, linking notes to tasks** - out of
  scope (redesign non-goals); a task is a timed session, not a to-do.
