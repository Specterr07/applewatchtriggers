# Future Work

Consolidated from every `docs/plans/PLAN_*.md` in this repo. See each plan file for
full detail - this is the organized index, grouped the way work actually
gets acted on.

## Already shipped (context, not pending work)

- **Named Tasks + Bento Cards + Detail Page** - `docs/plans/PLAN_NAMED_TASKS_BENTO_CARDS.md`
- **Server-side canvas persistence** - `docs/plans/PLAN_CANVAS_SAVE.md`
- **Voice notes** (record → transcribe → compress → store) - `docs/plans/PLAN_VOICE_NOTES.md`

## Fully decided and ready to build

**Nothing, right now.** Everything remaining on the roadmap either has
open questions blocking it (LLM Reminders, below) or is explicitly on
hold as a unit (the multi-user pivot, below) - there's currently no
plan file describing a feature that's fully specced and just waiting
to be coded.

## Open questions to answer

### LLM Tool-Calling for Reminders — `docs/plans/PLAN_LLM_REMINDERS.md`
Nothing about this feature is decided beyond its name. Before it can
move to "ready to build," these need answers:
- What actually triggers a reminder (an LLM reading notes/tasks and
  deciding something needs follow-up? An explicit user request? A
  scheduled check)?
- What "tool-calling" means here concretely - which LLM/provider, what
  tools it calls, what initiates the call.
- Where reminders get stored (schema, and whether it follows the
  per-feature-SQLite pattern or something else).
- Delivery timing/reliability across Telegram + Web Push.
- Whether it's related to voice notes specifically, or a separate
  standalone feature.
- Whether it ships single-user (before the multi-user pivot) or waits
  for it, since Telegram/Web Push delivery is inherently per-account.

### Multi-user pivot's remaining technical gaps — `docs/plans/PLAN_MULTI_USER.md`
These don't block anything **today** (the pivot itself is deferred -
see below), but they're the open questions that will need answers
before it can move from "decided in outline" to "ready to build":
- Auth mechanics (session vs. token, library, password hashing,
  signup: open or invite-only).
- **Whether SQLite survives the concurrency shift**, or this pivot is
  also when storage moves to something like Postgres - a large fork in
  what the future architecture even looks like, not a minor detail.
- Exact per-user isolation mechanism (`user_id` columns, whether
  `canvas` moves from "exactly one row" to "one row per user," Tigris
  key structure).
- What "usage/cost metrics" tracks, precisely, and who can see it.
- How today's single-user data becomes "user #1" on migration.
- Telegram account-linking and Web Push (VAPID, service worker,
  permission flow) implementation specifics.

## Explicitly deferred

### Multi-user pivot — `docs/plans/PLAN_MULTI_USER.md`
Decided to build **after everything else** on this list; the app stays
Vivek-only until then. What's already decided about it (so it's not
starting from zero when its turn comes):
- Real email/password accounts.
- Per-user data isolation across every database.
- Per-user usage/cost metrics.
- Apple Push dropped entirely, in favor of Telegram + Web Push.

Its remaining technical gaps are tracked above so they don't get lost,
even though there's no urgency to resolve them yet.
