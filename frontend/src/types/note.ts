// Voice note shapes from routes/notes.py.

export type Note = {
  id: number
  transcript: string
  // Presigned playback link (expires after ~1h); null if one couldn't be made.
  audio_url: string | null
  created_at: string // server wall-clock "YYYY-MM-DD HH:MM:SS"
}

// GET /api/notes
export type ListNotesResponse = {
  ok: true
  notes: Note[] // newest first
}

// POST /api/notes
export type CreateNoteResponse = {
  ok: true
  note: Note
}
