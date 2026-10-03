// Voice note endpoints (routes/notes.py):
//   GET    /api/notes       -> { ok, notes: Note[] }   newest first
//   POST   /api/notes       -> 201 { ok, note }        multipart field "audio"
//   PATCH  /api/notes/<id>  -> { ok, note }            body { title }
//   DELETE /api/notes/<id>  -> { ok }                  404 if already gone
// There is no single-note or processing-status endpoint: POST uploads,
// transcribes (Groq), titles it (Groq LLM), compresses (ffmpeg) and stores
// (Tigris) in one request.

import { ApiError, apiFetch, interpretResponse, NETWORK_ERROR_MESSAGE } from '@/api/client'
import type { CreateNoteResponse, ListNotesResponse, Note, UpdateNoteResponse } from '@/types/note'
import { getStoredApiKey } from '@/utils/session'

// Every note, newest first, each with a fresh playback link.
export async function listNotes(): Promise<Note[]> {
  const data = await apiFetch<ListNotesResponse>('/api/notes')
  return data.notes
}

// Renames a note. An empty title clears it (the list then shows the first words).
export async function renameNote(noteId: number, title: string): Promise<Note> {
  const data = await apiFetch<UpdateNoteResponse>(`/api/notes/${noteId}`, { method: 'PATCH', body: { title } })
  return data.note
}

// Permanently deletes a note (its audio first, then its record).
export async function deleteNote(noteId: number): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/notes/${noteId}`, { method: 'DELETE' })
}

// Uploads a recording and waits for the server to transcribe and store it.
//
// Uses XMLHttpRequest rather than fetch() for one reason: it reports when
// the audio has finished *sending*. That's the real boundary between
// "Uploading" and "Transcribing" - fetch() can't tell us, and we don't want
// to show a made-up progress state. `onUploaded` fires at that moment.
export function createNote(audio: Blob, filename: string, onUploaded?: () => void): Promise<Note> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', '/api/notes')
    const apiKey = getStoredApiKey()
    if (apiKey) request.setRequestHeader('X-API-Key', apiKey)
    // No Content-Type header: the browser sets the multipart boundary itself.

    request.upload.onload = () => onUploaded?.()
    request.onerror = () => reject(new ApiError(NETWORK_ERROR_MESSAGE, 0))
    request.onload = () => {
      let data = null
      try {
        data = JSON.parse(request.responseText)
      } catch {
        // A proxy or crash page instead of our JSON envelope - handled below as "no data".
      }
      try {
        resolve(interpretResponse<CreateNoteResponse>(request.status, data).note)
      } catch (err) {
        reject(err)
      }
    }

    const form = new FormData()
    form.append('audio', audio, filename)
    request.send(form)
  })
}
