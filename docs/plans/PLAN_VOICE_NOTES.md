# Plan: Voice Notes

**Status: Shipped.** Commit `52088d9`. Written up here retroactively.

**Goal:** a new "Notes" tab for voice notes - record audio in-browser,
transcribe it, and keep only a small compressed copy of the audio.

## Decisions

- Record audio in-browser via `MediaRecorder`; upload it; transcribe it
  server-side using the **Groq API** (`GROQ_API_KEY` env var); then
  re-encode the audio via **ffmpeg** to a low-bitrate mono file *before*
  storing it - the original high-quality upload is never kept.
- Store the compressed audio in **Tigris** (Fly's S3-compatible object
  storage) via `boto3`, using `AWS_ACCESS_KEY_ID` /
  `AWS_SECRET_ACCESS_KEY` / `AWS_ENDPOINT_URL_S3` / `BUCKET_NAME` env
  vars - set as Fly secrets ahead of time, just read them.
- Store each note's transcript + audio reference + timestamp in a new
  `services/notes_db.py`, again a separate SQLite file (`notes.db`),
  matching the per-feature-database pattern.
- New `routes/notes.py`: `POST /api/notes` (upload → transcribe →
  compress → store, in one request), `GET /api/notes` (list, newest
  first), `DELETE /api/notes/<id>` (removes both the DB row and the
  Tigris object).
- New Notes tab UI in `static/index.html`: a record button, a list of
  past notes (transcript text + audio playback + delete), and
  deliberate attention to the loading state: a clear in-progress state
  ("Transcribing…") after tapping Stop, the record button disabled
  while one is mid-save, a clear error state with a way to retry
  (never silently losing the recording), and the new note appearing at
  the top of the list immediately on success.
- `ffmpeg` added to the Dockerfile's Python stage (`apt-get`); `boto3`
  and `groq` added to `requirements.txt`.

### What actually got built (beyond the letter of the plan)
- `notes.db` stores the audio's **object key**, not a URL -
  `GET /api/notes` mints a fresh 1-hour presigned Tigris URL on every
  request instead of persisting one, since a stored "permanent" URL
  would just be a presigned link quietly expiring later.
- `signature_version="s3v4"` explicitly configured on the boto3 client -
  Tigris isn't AWS, so boto3's legacy SigV2-in-some-regions default
  doesn't apply, and presigned URLs would come out invalid without it.
- gunicorn's timeout bumped from the 30s default to 120s, since
  `POST /api/notes` does upload + transcription + compression + upload
  in one request.
- The failed-recording Retry resends the **same recorded blob** (kept
  in memory), not a fresh re-recording.
