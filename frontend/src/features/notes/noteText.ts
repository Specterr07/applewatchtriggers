// Small, pure helpers for showing, finding and grouping notes.

import type { Note } from '@/types/note'
import { formatDayHeading, type WallClock } from '@/utils/time'

type NoteText = Pick<Note, 'title' | 'transcript'>

// The note's AI (or hand-typed) title. Notes without one - older notes, or
// when the title call failed - fall back to the transcript's first line,
// shortened, or "Voice note" if nothing was said.
export function getNoteTitle(note: NoteText, maxLength = 80): string {
  const title = note.title?.trim()
  if (title) return title
  const firstLine = note.transcript.trim().split('\n')[0]?.trim() ?? ''
  if (!firstLine) return 'Voice note'
  return firstLine.length > maxLength ? `${firstLine.slice(0, maxLength - 1)}…` : firstLine
}

// True when the note has a real title, so the transcript is worth showing
// underneath as a preview (otherwise the "title" already is the transcript).
export function hasRealTitle(note: NoteText): boolean {
  return Boolean(note.title?.trim())
}

// Notes whose title or transcript contains the search text (case-insensitive).
// Searches only what's already loaded - there's no server-side search.
export function filterNotes(notes: Note[], query: string): Note[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return notes
  return notes.filter(
    (note) => note.transcript.toLowerCase().includes(needle) || (note.title ?? '').toLowerCase().includes(needle),
  )
}

export type NoteDayGroup = {
  dateKey: string // "YYYY-MM-DD"
  heading: string // "Today", "Yesterday", "Mon, 28 Sep"
  notes: Note[]
}

// Splits a newest-first list into one group per day, keeping the order.
// The day comes straight from the server timestamp, so there's no
// timezone conversion to get wrong.
export function groupNotesByDay(notes: Note[], now: WallClock): NoteDayGroup[] {
  const groups: NoteDayGroup[] = []
  for (const note of notes) {
    const dateKey = note.created_at.slice(0, 10)
    const last = groups[groups.length - 1]
    if (last && last.dateKey === dateKey) {
      last.notes.push(note)
    } else {
      groups.push({ dateKey, heading: formatDayHeading(dateKey, now), notes: [note] })
    }
  }
  return groups
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
