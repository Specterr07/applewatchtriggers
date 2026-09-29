import { Link } from 'react-router'

import { Card } from '@/components/ui/Card'
import { NotePlayButton } from '@/features/notes/NoteAudio'
import type { Note } from '@/types/note'
import { formatEventTime, type WallClock } from '@/utils/time'

// Notes as a single, content-first list: transcript preview and when it
// was recorded (opens the note), with a play button beside it.
export function NoteList({ notes, now }: { notes: Note[]; now: WallClock }) {
  return (
    <Card>
      <ol className="divide-y divide-border">
        {notes.map((note) => (
          <li key={note.id} className="flex items-center gap-2 pr-2">
            <Link to={`/notes/${note.id}`} className="min-w-0 flex-1 px-4 py-3 hover:bg-surface-muted">
              <p className="line-clamp-2 break-words">{note.transcript.trim() || 'No speech was detected.'}</p>
              <p className="mt-1 text-sm text-secondary tabular-nums">{formatEventTime(note.created_at, now)}</p>
            </Link>
            <NotePlayButton note={note} />
          </li>
        ))}
      </ol>
    </Card>
  )
}
