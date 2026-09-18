# Future Architecture: After the Multi-User Pivot

**This is speculative, not a build plan.** It shows what the current
architecture (`ARCHITECTURE.md`) becomes if every decision already made
in `PLAN_MULTI_USER.md` is applied - color-coded so it's obvious what's
actually decided (🟢 green), what's a firm decision but with real gaps in
*how* (🟡 yellow, dashed), and what's being removed (⬛ grey). Nothing
yellow was guessed at; each one is a listed open question in
`PLAN_MULTI_USER.md` or `PLAN_LLM_REMINDERS.md`. This pivot is explicitly
**deferred until after everything else** - this diagram exists so the
gaps are visible now, not because it's happening next.

```mermaid
flowchart TB
    Watch["📱 Apple Watch Shortcut<br/>GET /toggle?key=... (unchanged)"]
    Browser["🌐 Browser — webpage<br/>now behind account login"]
    CanvasApp["🌐 Browser — /canvas app"]

    subgraph AuthNew["🟢 NEW: Accounts"]
        AuthLayer["🟡 Auth layer — email + password<br/>session vs. token, library,<br/>password hashing scheme: TBD"]
    end

    Browser --> AuthLayer
    CanvasApp --> AuthLayer

    subgraph FlaskApp["Flask app — same blueprints, now auth-gated per account"]
        TasksRoute["routes/tasks.py"]
        CanvasRoute["routes/canvas.py"]
        NotesRoute["routes/notes.py"]
        RemindersRoute["🟡 routes/reminders.py ?<br/>shape entirely undecided -<br/>see PLAN_LLM_REMINDERS.md"]
    end

    Watch --> TasksRoute
    AuthLayer --> TasksRoute
    AuthLayer --> CanvasRoute
    AuthLayer --> NotesRoute
    AuthLayer --> RemindersRoute

    subgraph Storage["Storage — per-user isolation added everywhere"]
        EngineChoice["🟡 Still per-feature SQLite files,<br/>OR moved to Postgres for real<br/>concurrent multi-user writes:<br/>NOT DECIDED"]
        UsersDB[("🟢 users (NEW)<br/>email, password hash")]
        TasksDB[("tasks<br/>🟢 + user_id (NEW column)")]
        CanvasDB[("canvas<br/>🟢 + user_id (NEW)<br/>🟡 one row per user? exact<br/>shape TBD")]
        NotesDB[("notes<br/>🟢 + user_id (NEW column)")]
        UsageDB[("🟢 usage/cost metrics (NEW)<br/>per user - 🟡 WHAT it tracks<br/>(requests? $ cost? bytes?): TBD")]
    end

    TasksRoute --> TasksDB
    CanvasRoute --> CanvasDB
    NotesRoute --> NotesDB
    AuthLayer --> UsersDB
    FlaskApp -.->|"🟢 records usage per request<br/>(what exactly: TBD)"| UsageDB

    subgraph External["External services"]
        Tigris[("Tigris<br/>🟡 key structure gains a per-user<br/>prefix, e.g. notes/&lt;user_id&gt;/&lt;uuid&gt;.mp3<br/>- exact structure TBD")]
        Groq["Groq API (unchanged)"]
        TelegramSvc["🟢 Telegram (NEW delivery channel)<br/>🟡 account-linking flow: TBD"]
        WebPushSvc["🟢 Web Push (NEW delivery channel)<br/>🟡 VAPID/service-worker setup: TBD"]
        ApplePushSvc["⬛ Apple Push — dropped entirely"]
    end

    NotesRoute --> Tigris
    NotesRoute --> Groq
    RemindersRoute -.->|"🟡 trigger mechanism TBD"| TelegramSvc
    RemindersRoute -.->|"🟡 trigger mechanism TBD"| WebPushSvc

    Migration["🟡 Existing single-user data becomes user #1:<br/>migration approach NOT DECIDED"]
    UsersDB -.- Migration

    classDef green fill:#d9f2d9,stroke:#2e7d32,color:#000;
    classDef yellow fill:#fff3cd,stroke:#c99a06,stroke-dasharray:4 3,color:#000;
    classDef grey fill:#ececeb,stroke:#8a8a88,color:#555,stroke-dasharray:2 2;

    class AuthNew,AuthLayer green
    class UsersDB,TasksDB,CanvasDB,NotesDB,UsageDB green
    class TelegramSvc,WebPushSvc green
    class EngineChoice,RemindersRoute,Migration yellow
    class ApplePushSvc grey
```

## What actually changes from today

**Decided (🟢):**
- A new `users` table/store and an auth layer gate every route that's
  currently protected by the single shared `API_KEY`.
- `tasks`, `canvas`, and `notes` all gain per-user isolation - shown
  here as a `user_id` column, the natural shape of "per-user isolation
  across every database," though the exact column name/shape is itself
  one of the yellow items below.
- A new usage/cost-metrics store, per user.
- Telegram and Web Push become real delivery channels; Apple Push is
  removed from the picture entirely, not just deprioritized.

**Genuinely undecided (🟡) - not guessed at here:**
- Whether SQLite-per-feature survives real concurrent multi-user
  writes, or this is also when the database engine changes (e.g. to
  Postgres). This is the single biggest fork in what this diagram
  could actually look like, and it's unresolved.
- The auth mechanism itself (sessions vs. tokens, which library,
  password hashing).
- Whether `canvas` becomes "one row per user" or something else - today
  it's hard-constrained to exactly one row, period.
- What the usage/cost metrics actually measure.
- The exact Tigris key structure once it's per-user.
- How today's single-user data becomes the first real account.
- What triggers a reminder at all, and therefore what
  `routes/reminders.py` (if that's even its name) looks like - this
  entire box is a placeholder for a feature with no spec yet
  (`PLAN_LLM_REMINDERS.md`).
- Telegram account-linking and Web Push's browser-permission/VAPID setup.

**Removed (⬛):**
- Apple Push, entirely - not replaced with anything Apple-specific, per
  the decision already made.
