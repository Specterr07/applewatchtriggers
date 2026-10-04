# Plan: Multi-User Pivot

**Status: Decided in outline, not speced. Explicitly deferred - build
AFTER everything else on the roadmap; the app stays Vivek-only until
then.** Written up here for the first time, from what's been stated so
far. Anything not in the "Decided" list below is a genuine open
question, not an assumption.

## Decided

1. **Real accounts** - email/password, not this app's current
   shared-secret `API_KEY` model.
2. **Per-user data isolation across every database.** Today's four
   SQLite files (`tasks.db`, `canvas.db`, `notes.db`, `channels.db`) - and anything
   added before this pivot happens - all need to stop being "one
   dataset, shared secret" and become "one dataset per account."
3. **Per-user usage/cost metrics.** Some accounting of usage/cost per
   account (this app calls two paid external services today - Groq
   transcription and Tigris storage - so per-user cost visibility
   matters once more than one person is using it).
4. **Apple Push dropped entirely.** Messages from the server to a user
   go out via **Telegram + Web Push** instead, not through Apple's push
   service. (Telegram exists today, single-user; Web Push is a
   multi-user-era addition. WhatsApp has been dropped entirely.)
5. **Sequencing:** this is explicitly the LAST thing built, after
   everything else currently planned. Single-user (Vivek-only) is the
   working assumption for all other in-progress and planned work.

## Open questions

These are things the pivot will need an answer to, that haven't been
decided yet:

- **Auth mechanics.** Session cookies vs. token-based auth; which
  library/approach; password hashing scheme; session length; whether
  signup is open or invite-only once this ships.
- **Database engine.** Every database in this app is SQLite, one file
  per feature, opened-and-closed per request - a pattern that works
  well for a single user with no concurrent writers. Whether that
  still holds for genuine multi-user concurrent write load, or whether
  this pivot is also the point where storage moves to something like
  Postgres, is unanswered. This is a big fork in how the future
  architecture actually looks, not a minor detail.
- **Exact isolation mechanism.** "Per-user data isolation across every
  database" almost certainly means a `user_id` (or similar) column
  added to `tasks`, `canvas`, and `notes` (and a per-user prefix on
  Tigris object keys, e.g. something like `notes/<user_id>/<uuid>.mp3`)
  - but the exact column name, whether `canvas` moves from "exactly one
  row" to "one row per user," and the exact Tigris key structure
  haven't been decided.
- **What "usage/cost metrics" tracks, precisely.** Request counts?
  Actual Groq/Tigris $ cost attribution per user? Storage bytes used?
  Visible to each user, to an admin (you) only, or both?
- **Migration of existing data.** How today's single-user data (your
  own tasks/canvas/notes) becomes "user #1" when this ships - a manual
  one-time migration, a seed script, or something else.
- **Telegram for many users.** The bot itself is built and live
  (`docs/features/messaging-channel.md`): deep-link pairing with one-time
  codes, `channels.db`, `send_to_user()`. But every link is hard-wired to
  `user_id = 1`. Open: how a signed-in user's account maps to their own
  link, and how the webhook routes incoming notes to the right user.
- **Web Push specifics.** Service worker, VAPID keys, the browser
  permission flow, and how it coexists with Telegram as a second
  delivery channel for the same messages.
