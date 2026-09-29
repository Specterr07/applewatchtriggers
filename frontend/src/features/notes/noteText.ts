// Small, pure helpers for showing and finding notes. A note has no title
// field in the backend - only its transcript - so the title is derived.

import type { Note } from '@/types/note'

// First line of the transcript, shortened (or "Voice note" if it's blank).
export function getNoteTitle(transcript: string, maxLength = 80): string {
  const firstLine = transcript.trim().split('\n')[0]?.trim() ?? ''
  if (!firstLine) return 'Voice note'
  return firstLine.length > maxLength ? `${firstLine.slice(0, maxLength - 1)}…` : firstLine
}

// Notes whose transcript contains the search text (case-insensitive).
// Searches only what's already loaded - there's no server-side search.
export function filterNotes(notes: Note[], query: string): Note[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return notes
  return notes.filter((note) => note.transcript.toLowerCase().includes(needle))
}

export type NotesViewState = 'loading' | 'error' | 'empty' | 'no-matches' | 'list'

// Which state the Notes list is in. Earlier data is still shown if a
// background refresh fails ('list'), rather than replacing it with an error.
export function getNotesViewState({
  isPending,
  isError,
  notes,
  matches,
}: {
  isPending: boolean
  isError: boolean
  notes: Note[] | undefined
  matches: Note[]
}): NotesViewState {
  if (isPending) return 'loading'
  if (!notes) return isError ? 'error' : 'loading'
  if (notes.length === 0) return 'empty'
  if (matches.length === 0) return 'no-matches'
  return 'list'
}
