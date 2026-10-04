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
known bugs), then **one new feature (Reminders)** that hasn't been
planned yet, then the deferred multi-user pivot.

---

## ✅ Shipped

| Feature | Record | Shipped |
|---|---|---|
| Named tasks + bento cards + task detail | `docs/plans/PLAN_NAMED_TASKS_BENTO_CARDS.md` | before 2026-09 |
| Server-side canvas persistence | `docs/plans/PLAN_CANVAS_SAVE.md` | before 2026-09 |
| Voice notes (record → transcribe → compress → store) | `docs/plans/PLAN_VOICE_NOTES.md` | before 2026-09 |
| Telegram channel (voice notes in, messages out) | `docs/features/messaging-channel.md` | 2026-09 |
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

All screens are built and merged, but the spec's review steps were never
formally done. Details in `docs/features/frontend-redesign.md` (Status
block at the top, §10 and §13).

- [ ] **Parity walk-through** (§13): every item, on a real phone and a
      desktop, against production data. Tick the boxes in §13 as they pass.
- [ ] **Phase 7 - canvas review** inside the new shell (visual/UX pass,
      plus any small fixes that come out of it).
- [ ] **Performance & accessibility check** (§13 Quality): initial JS
      ≤ 250 KB gzipped, tldraw chunk not loaded on Home, Lighthouse mobile
      Performance ≥ 85 / Accessibility ≥ 95.
- [ ] **Delete `static/index.html`** once the parity walk-through passes
      (keep `static/openapi.yaml`). Update `PROJECT_STRUCTURE.md`,
      `ARCHITECTURE.md` and `docs/STANDARDS.md` in the same commit.
- [ ] Phases 8-10 (real-time UX polish, demo) - only what's still worth
      doing after the wrap-up; the Loom video above covers "demo".

## 3. Known bugs & small fixes (no feature file needed)

- [ ] **A 401 during a voice-note upload signs you out and the recording
      is lost.** It should keep the recording so it can be retried after
      signing back in. *(highest priority)*
- [ ] **No build version in Settings.** Spec §5.3 asks for the build
      commit, but nothing records one (the Docker context excludes
      `.git`). Needs a build arg passed from CI. See the comment in
      `frontend/src/features/settings/`.
- [ ] **Primary-button hover drops to ~4.2:1 contrast** in light mode
      (AA needs 4.5:1).
- [ ] **Decide React Query `staleTime`** (`frontend/src/api/queryClient.ts`,
      currently 15s): focus-driven refetches were seen every ~18s; raising
      it to 60s is the open option.
- [ ] **Groq/Tigris success paths were only verified with a stub
      harness** - covered in practice now that notes and titles work in
      production, but there's no automated test for them.
- [ ] **Docker build not verified locally** (no Docker on the Mac). Fly's
      remote builder builds it fine; low priority.

## 4. Later - needs planning before any code

### Reminders (LLM tool-calling) - `docs/plans/PLAN_LLM_REMINDERS.md`
**Not started, not specced.** The next new feature after the wrap-up.
What's already known: there will be a **Reminders tab** on the webpage
where reminders show up and can be edited; **Telegram is the only
delivery channel** (`send_to_user()` already exists for this). Everything
else - what creates a reminder, which model, the tools it calls, storage,
timing - is an open question listed in the plan file.

**Next step:** start `docs/features/reminders.md` from
`docs/features/_template.md` and work through Think → Draw → 🔒 Locked.
No code until it's locked.

## 5. Deferred on purpose

### Multi-user pivot - `docs/plans/PLAN_MULTI_USER.md`
Built **last**, after everything above; the app stays Vivek-only until
then. Decided in outline (email/password accounts, per-user data in every
database, per-user usage/cost metrics, Apple Push dropped). Its open
technical questions (auth mechanics, SQLite vs. Postgres, isolation
mechanism, metrics, migrating today's data to "user #1", Telegram
account-linking, Web Push) are tracked in the plan file and in
`FUTURE_ARCHITECTURE.md`. Nothing to do on it now.

## 6. Ideas - only being thought about

Not on the roadmap. Promote to a feature file only if it becomes a real
plan.

- **Local fallback for transcription and titling.** When Groq is down or
  rate-limited, run a small/moderate model locally on the Mac instead
  (~30-60s per note is acceptable). Not decided how it would connect to
  the Fly server.

## 7. Dropped - don't build these

- **WhatsApp channel** - dropped entirely. Telegram is the only messaging
  channel. (Reason: WhatsApp only allows free messages within 24h of the
  user writing, needs Meta business verification and costs per message -
  see `docs/features/messaging-channel.md`.)
- **Apple Push notifications** - dropped in favour of Telegram (and, in
  the multi-user future, Web Push).
- **Planner** - removed earlier (see git history).
- **Kanban, projects, tags, due dates, linking notes to tasks** - out of
  scope (redesign non-goals); a task is a timed session, not a to-do.
