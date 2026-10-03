# Notes first + AI titles

**Status:** 3. Build  <!-- 1. Think → 2. Draw → 🔒 Locked → 3. Build → ✅ Shipped -->

Branch: `feature/notes-first-ai-titles`

---

## 1. Think

**Problem:**
1. A voice note is just a wall of transcript. In the list, the "title" is
   only the first line of what I said (`getNoteTitle()` in
   `frontend/src/features/notes/noteText.ts`), so I can't tell at a glance
   what a note is about.
2. The app's real everyday use is now **recording notes**, but Home is
   built around tasks (running timer, today's task stats). Notes are one
   tab away instead of front and centre.

**Building:**
- Every new note gets a short AI title (3–7 words), saved with the note.
- The title can be edited by hand.
- Old notes (recorded before this) get titles too, once.
- Telegram's "Saved ✅" reply shows the title.
- Home becomes notes-first: a big Record button, then recent notes
  grouped by day (Today / Yesterday / Earlier), each showing its title.
- Tasks stay, but as a secondary thing: a small "running task" strip on
  Home (only when a task is running), and the Tasks tab.
- Search covers titles as well as transcripts.

**Not building:**
- Folders, tags or AI categories for notes (maybe later - "arranging").
- AI summaries of notes (title only).
- A background job queue. The title call is fast enough to do inline.
- Any change to how transcription works.

**Options I looked at - which model writes the title:**
| Option | Good | Bad |
|--------|------|-----|
| **Groq `llama-3.1-8b-instant`** | Same Groq key + SDK I already use for Whisper. Free tier (≈30 req/min, 14,400/day). Very fast. Small model is plenty for a 3–7 word title. | Rate limits are per Groq account, shared with Whisper. 8B can occasionally ramble - handled by a strict prompt + cleanup. |
| Groq `llama-3.3-70b-versatile` | A bit more accurate. | Lower free-tier limits, slower. Overkill for a title. |
| OpenAI GPT-5 nano / Gemini Flash-Lite | Very cheap. | New account, new key, new SDK, costs money. No real gain. |
| No LLM - first words of the transcript | Free, no failure mode. | That's what we have today, and it's the problem. |

→ Use `llama-3.1-8b-instant`; the first-words title stays as the fallback.

**Options I looked at - Home layout:**
| Option | Good | Bad |
|--------|------|-----|
| **A. Rework Home into a notes-first page** (Record + recent notes by day + small task strip). Keep `/notes` as the full list with search. | Home answers "record / what did I say recently" instantly; full list still has room for search. Small change to routing. | Two places show notes (Home = recent, Notes = all). |
| B. Make `/` *be* the Notes page and drop the separate Home | One place for notes. | Lose the "running task" glance entirely, or cram it into the notes page. Bigger nav/route change. |

**Open questions:** *(all answered 2026-10-03)*
- [x] Home layout: A or B?
      → **A. Rework Home** into Record + recent notes by day + a small running-task strip. `/notes` stays as the full searchable list.
- [x] Old notes: script or per-note button?
      → **One-time script** (`scripts/backfill_note_titles.py`), run once on Fly with `fly ssh console`. Only touches notes whose title is empty, so re-running it is safe.
- [x] Phone's centre ➕ button?
      → **Keep the Capture sheet** (note *or* task) as it is today.
- [x] Bottom nav order on phones?
      → **`Home · Notes · ➕ · Tasks · More`** - Notes moves next to Home, Tasks moves right.

---

## 2. Draw

### Flowchart - saving a note (web or Telegram)
```mermaid
flowchart TD
    A[Audio uploaded] --> B[Whisper transcribes - Groq]
    B --> C{Transcript empty?}
    C -- yes --> T0[title = null]
    C -- no --> D[Send first ~1500 chars to llama-3.1-8b-instant]
    D --> E{Call OK and title looks sane?}
    E -- yes --> T1[title = cleaned AI title]
    E -- no: 429 / error / junk --> T0
    T0 --> F[Compress audio + upload to Tigris]
    T1 --> F
    F --> G[Insert row: transcript, title, audio_key, created_at]
    G --> H[Return note incl. title]
    H --> I[UI shows title, or first words if title is null]
```

### Architecture - the parts and who talks to whom
```mermaid
flowchart LR
    Web[React app] -->|POST /api/notes| Route[routes/notes.py]
    TG[Telegram] --> TGRoute[routes/telegram.py]
    Route --> Pipe[services/note_pipeline.py]
    TGRoute --> Pipe
    Pipe --> STT[services/transcription.py\nWhisper on Groq]
    Pipe --> Title[services/titling.py  NEW\nllama-3.1-8b-instant on Groq]
    Pipe --> Store[services/object_storage.py\nTigris]
    Pipe --> DB[(notes.db\n+ title column)]
    Web -->|PATCH /api/notes/id  NEW| Route
```

### Decisions
- **Title model = Groq `llama-3.1-8b-instant`.** Free, already-wired provider; one place to change it (`MODEL` constant in `services/titling.py`).
- **The title must never block saving a note.** `generate_title()` never raises - on any failure it returns `None` and the note saves with no title. The UI falls back to the first words.
- **Inline, not background.** The 8B call is a fraction of a second next to Whisper + ffmpeg, so no job queue. Keeps it simple.
- **Cheap + accurate prompt:** system prompt "Return only a title of 3–7 words for this voice note. Same language as the note. No quotes, no ending punctuation."; `temperature=0`; `max_tokens=20`; send only the first 1500 characters.
- **Cleanup after the model (`clean_title`, a pure function, unit-tested):** strip quotes/"Title:" prefixes/trailing dots, collapse whitespace, cap at 60 chars; empty → `None`.
- **DB: `title TEXT NULL` column on `notes`.** Added by `ensure_notes_db()` with a `PRAGMA table_info` check + `ALTER TABLE ADD COLUMN`, so the existing notes.db on the Fly volume upgrades itself on the next request - no manual migration.
- **API:** `title` added to every note in responses (nullable). New `PATCH /api/notes/<id>` with `{"title": "..."}` for manual edits. `static/openapi.yaml` updated.
- **Frontend:** `Note.title: string | null`; `getNoteTitle(note)` = `title ?? first words`. List shows title (bold) + one-line preview. Note detail has an editable title. Search matches title + transcript. New pure helper `groupNotesByDay()` - one group per day: Today / Yesterday / "Mon, 28 Sep" (unit-tested).
- **Home:** Record card on top → recent notes grouped by day → "See all notes" link. Running-task strip shown only while a task runs. Today's task stats move off Home (still on Tasks / Time Log).
- **Sidebar order:** Home, Notes, Tasks, Time Log, Canvas. **Phone bottom nav:** Home · Notes · ➕ (Capture sheet, unchanged) · Tasks · More.
- **Backfill = one-time script**, not a UI button: old notes are a fixed, small set, so a button would be UI that's useless after one use. The script sleeps ~2s between calls to stay under the Groq free-tier limit of 30 requests/min.

---

## 3. Build

**Backend**
- [x] `services/titling.py` - `clean_title()` + `generate_title()` (never raises)
- [x] `services/notes_db.py` - `title` column migration, `insert_note(..., title)`, `update_note_title()`
- [x] `services/note_pipeline.py` - call `generate_title()` after transcription
- [x] `routes/notes.py` - include `title`; add `PATCH /api/notes/<id>`
- [x] `routes/telegram.py` - reply with title
- [x] `scripts/backfill_note_titles.py` - title every note whose title is NULL (safe to re-run)
- [x] Tests: `clean_title`, pipeline saves when titling fails, DB migration on an old-shape table, PATCH route
- [x] `static/openapi.yaml`

**Frontend**
- [x] `types/note.ts` - `title`
- [x] `noteText.ts` - `getNoteTitle(note)`, search on title, `groupNotesByDay()` + tests
- [x] `NoteList` / `NoteDetail` - show title, edit title (`useUpdateNoteTitle` mutation)
- [x] `HomePage` - notes-first layout + small running-task strip
- [x] Nav: sidebar order + bottom nav `Home · Notes · ➕ · Tasks · More`

**Wrap-up**
- [x] `PROJECT_STRUCTURE.md` (new service, new script, new endpoint, new column)
- [x] Run pytest + vitest + `npm run build`; check Home on phone width
- [ ] Deploy to Fly, record a note, confirm the title appears

**What actually got built / what I learned:**
- Built as planned. Two small additions found while building:
  - The Docker image didn't include a `scripts/` folder, so the backfill script couldn't have run on Fly - added `COPY scripts ./scripts` to the Dockerfile.
  - Days are grouped one heading per day (Today, Yesterday, Mon 28 Sep…) instead of a single "Earlier" bucket - reuses the existing `formatDayHeading()` and reads better.
- The sidebar's "Overview" is now called "Home" everywhere, since it's no longer an overview of tasks.
- `ActiveSessionCard` and `TodayStats` were removed from Home (replaced by the slim `RunningTaskStrip`); today's task totals are still on Time Log.
- Tests: 15 new pytest tests (47 total), 4 new vitest tests (66 total), build + lint clean. Checked Home at desktop and phone widths and renamed a note end to end on a local copy.
