# Plan: LLM Tool-Calling for Reminders

**Status: Not started, not specced.** It's the next new feature after
the portfolio wrap-up (`TODO.md` §4). Only the few facts under "What's
known" are decided; every item under "Open questions" is still open, not
an assumption.

**Next step:** when work starts, create `docs/features/reminders.md` from
`docs/features/_template.md`, copy the known facts and open questions
below into its Think section, and follow `docs/PROCESS.md`. No code until
that file says 🔒 Locked. After that, this file is just a pointer.

## What's known

- It's called "LLM tool-calling for reminders."
- **There will be a Reminders tab on the webpage** where reminders are
  listed and can be edited.
- **Telegram is the only delivery channel** for this build (WhatsApp was
  dropped entirely; Apple Push was ruled out earlier). The outbound pipe
  already exists: `services/channels.py:send_to_user()`, built and tested
  by the Telegram feature (`docs/features/messaging-channel.md`).
- Web Push only appears in the multi-user plan (`PLAN_MULTI_USER.md`), as
  a second channel for that future - it's not part of this build.
- Groq is already the app's model provider (Whisper for transcripts,
  `openai/gpt-oss-20b` for note titles, on the free tier). Whether
  reminders use the same provider is still open (below).

## Open questions

- **What triggers a reminder in the first place?** A few plausible
  shapes, none confirmed: an LLM reading voice notes/tasks and
  deciding something needs a follow-up; a user explicitly asking for a
  reminder (by voice or text) and an LLM parsing the intent/time out of
  it; a scheduled/recurring check over existing data (e.g. planner-style
  time-based reminders, though the Planner feature itself was removed -
  see `PROJECT_STRUCTURE.md`).
- **What does "tool-calling" mean here, concretely?** Which LLM/provider
  (Groq is already in use for transcription - is this the same
  provider?); what tools would it call (create/edit/delete a reminder,
  read tasks/notes for context, something else); who initiates the
  LLM call (a user action, a background job, both)?
- **Where do reminders live?** A new database/table (following this
  app's per-feature-SQLite-file pattern) is the obvious guess, but
  that's a guess, not a decision - schema, fields, and even whether
  it's SQLite or something else are all open.
- **Delivery timing and reliability.** Is this real-time (near the
  moment a reminder is "due") or best-effort/periodic? What checks for
  due reminders - a background thread, a scheduled job, an external
  cron hitting an endpoint? (The Fly machine is always on and runs one
  gunicorn worker.) What happens if a Telegram send fails?
- **What the Reminders tab can do.** List, edit, delete, mark done,
  snooze, create by hand? Which of those are needed for v1?
- **Relationship to voice notes.** Given notes are already transcribed
  through an LLM-adjacent pipeline (Groq Whisper), whether reminders
  are meant to come *from* notes specifically, or are a separate
  standalone feature that happens to share infrastructure, is unclear.
- **Single-user vs. multi-user timing.** Most likely single-user first,
  since the multi-user pivot is explicitly last and the Telegram link is
  already single-user (`user_id = 1`) - but this hasn't been explicitly
  confirmed.
