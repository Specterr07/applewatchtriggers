# Project instructions

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
