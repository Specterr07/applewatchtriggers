# Plan: LLM Tool-Calling for Reminders

**Status: Not started. Nothing about this feature has been decided
yet** beyond its name and that it exists on the roadmap - it was named
in passing (`applewatchtriggers` planning discussion) but never
specced. Every item below is an open question, not an assumption -
listed here so answering them in conversation can turn directly into
the "Decided" section of this file.

## What's known

- It's called "LLM tool-calling for reminders."
- It's related to `PLAN_MULTI_USER.md`: reminders it produces are
  meant to be delivered via Telegram + Web Push (Apple Push was
  explicitly ruled out) - but that connection is the only concrete
  fact tying the two plans together.

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
  moment a reminder is "due") or best-effort/periodic? What retries or
  delivery guarantees, if any, across the two channels (Telegram +
  Web Push)?
- **Relationship to voice notes.** Given notes are already transcribed
  through an LLM-adjacent pipeline (Groq Whisper), whether reminders
  are meant to come *from* notes specifically, or are a separate
  standalone feature that happens to share infrastructure, is unclear.
- **Single-user vs. multi-user timing.** `PLAN_MULTI_USER.md` is
  explicitly deferred until after everything else - does that mean
  reminders ship first, single-user (Vivek-only, no Telegram
  account-linking needed yet), or does this feature wait for
  multi-user because the delivery channels are inherently
  per-account?
