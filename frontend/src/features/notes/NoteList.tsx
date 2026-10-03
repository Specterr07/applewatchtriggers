import { useId } from 'react'
import { Link } from 'react-router'

import { Card } from '@/components/ui/Card'
import { NotePlayButton } from '@/features/notes/NoteAudio'
import { getNoteTitle, groupNotesByDay, hasRealTitle } from '@/features/notes/noteText'
import type { Note } from '@/types/note'
import { formatClockTime, formatEventTime, type WallClock } from '@/utils/time'

// Notes as a single, content-first list: title, a one-line transcript
// preview and when it was recorded (opens the note), with a play button.
// `timeOnly` shows just the clock time - for lists already grouped by day.
export function NoteList({ notes, now, timeOnly = false }: { notes: Note[]; now: WallClock; timeOnly?: boolean }) {
  return (
    <Card>
      <ol className="divide-y divide-border">
        {notes.map((note) => (
          <li key={note.id} className="flex items-center gap-2 pr-2">
            <Link to={`/notes/${note.id}`} className="min-w-0 flex-1 px-4 py-3 hover:bg-surface-muted">
              <p className="truncate font-medium">{getNoteTitle(note)}</p>
              {/* Without a real title, the "title" already is the transcript's start. */}
              {hasRealTitle(note) && note.transcript.trim() && (
                <p className="mt-0.5 truncate text-secondary">{note.transcript.trim()}</p>
              )}
              <p className="mt-1 text-sm text-secondary tabular-nums">
                {timeOnly ? formatClockTime(note.created_at) : formatEventTime(note.created_at, now)}
              </p>
            </Link>
            <NotePlayButton note={note} />
          </li>
        ))}
      </ol>
    </Card>
  )
}

// The same list, split under day headings: Today, Yesterday, Mon, 28 Sep…
export function GroupedNoteList({ notes, now }: { notes: Note[]; now: WallClock }) {
  return (
    <div className="flex flex-col gap-5">
      {groupNotesByDay(notes, now).map((group) => (
        <DayGroup key={group.dateKey} heading={group.heading} notes={group.notes} now={now} />
      ))}
    </div>
  )
}

function DayGroup({ heading, notes, now }: { heading: string; notes: Note[]; now: WallClock }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="mb-2 text-sm font-medium text-secondary-on-bg">
        {heading}
      </h3>
      <NoteList notes={notes} now={now} timeOnly />
    </section>
  )
}
