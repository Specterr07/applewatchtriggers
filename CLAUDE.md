# Project instructions

## Start here

Read `docs/claude-handoff.md` first - it says where the project stands,
the reading order, and the rules that matter most. The roadmap and
backlog (what's shipped, next, buggy, deferred or dropped) is `TODO.md`.
Don't rely on earlier chat context; the repo is the source of truth.

## Follow the feature process (docs/PROCESS.md)

Each new feature has one file in `docs/features/`, with three steps:
Think → Draw → Build. **Don't write code for a feature unless its
file's Status says 🔒 Locked** - if asked to, say what's still missing
and offer to finish it. When a conversation answers one of a feature's
open questions, tick it and write the answer in the file. Bug fixes and
small tweaks don't need this.

## Keep the status docs in sync

When work finishes, gets added or gets dropped, update `TODO.md` in the
same change (tick it, move it, or add it). When an area changes state
(e.g. a feature ships), update the table in `docs/claude-handoff.md` §3
and the feature file's **Status** line too.

## Keep PROJECT_STRUCTURE.md in sync

Whenever a change adds, removes, or restructures a file, folder, route,
service, or database, update `PROJECT_STRUCTURE.md` as part of that same
change - not as a separate follow-up task, and not something that waits
for the user to ask.

Treat an out-of-date `PROJECT_STRUCTURE.md` as an incomplete change, the
same way you'd treat a bug you introduced and didn't fix. Before
considering a change done, check whether it touched anything
`PROJECT_STRUCTURE.md` describes - a new/removed/renamed file or folder,
a new/removed route or endpoint, a new service module, a new database or
storage backend - and if so, update the doc's actual claims (not just
append a new section) in the same commit.

## Local preview quirk (Claude Code tooling, not this app)

`preview_start` with `{"name": "task-logger"}` (from `.claude/launch.json`)
has repeatedly launched a *different* project's dev server instead of this
one, when the session's working directory isn't already this repo. If that
happens, don't fight it - just run Flask directly:

```
.venv/bin/python -m flask --app app run --port 8080 --debug
```

and point the browser tools at `http://localhost:8080` with `navigate` /
`preview_start` using a `url`, not a `name`.
