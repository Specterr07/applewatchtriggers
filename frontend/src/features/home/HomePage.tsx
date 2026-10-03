import { ArrowRight, CloudOff, Mic, NotebookPen, RotateCw } from 'lucide-react'
import { Link } from 'react-router'

import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCapture } from '@/features/capture/CaptureProvider'
import { RunningTaskStrip } from '@/features/home/RunningTaskStrip'
import { GroupedNoteList } from '@/features/notes/NoteList'
import { useGuardedToggle } from '@/hooks/useGuardedToggle'
import { useNotes } from '@/hooks/useNotes'
import { useNow } from '@/hooks/useNow'
import { findActiveTask, useTasks } from '@/hooks/useTasks'
import { formatLongDate, greetingFor, toDateKey } from '@/utils/time'

// Home also refreshes tasks on this interval (only while the tab is
// visible), so a task started or stopped from the Watch shows up within a minute.
const HOME_REFRESH_MS = 60_000

// How many of the newest notes Home shows; the rest are on /notes.
const RECENT_NOTES_LIMIT = 8

// Home: notes first. A big Record button, the latest notes grouped by day,
// and a slim running-task strip - tasks are the secondary job of the app.
export function HomePage() {
  const notesQuery = useNotes()
  const tasksQuery = useTasks({ refetchIntervalMs: HOME_REFRESH_MS })
  const activeTask = findActiveTask(tasksQuery.data)
  // Tick every second only while a timer is on screen.
  const now = useNow(activeTask ? 1000 : 30_000)
  const { toggle, isPending } = useGuardedToggle()
  const { openRecorder, openStartTask } = useCapture()

  const notes = notesQuery.data ?? []
  const todayKey = toDateKey(now)
  const notesToday = notes.filter((note) => note.created_at.startsWith(todayKey)).length

  return (
    <Page title={greetingFor(now.hour)} description={formatLongDate(now)}>
      <div className="flex flex-col gap-6">
        <RecordCard onRecord={openRecorder} notesToday={notesToday} />

        {/* Tasks failing to load only hides this strip - notes still work. */}
        {tasksQuery.data && (
          <RunningTaskStrip
            activeTask={activeTask}
            now={now}
            isPending={isPending}
            onStart={openStartTask}
            onStop={() => void toggle({ action: 'End' })}
          />
        )}

        <section aria-labelledby="recent-notes-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="recent-notes-heading" className="text-md font-semibold">
              Recent notes
            </h2>
            {notes.length > 0 && (
              <Link to="/notes" className="flex items-center gap-1 font-medium text-accent-text">
                See all
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            )}
          </div>

          {notesQuery.isError && notesQuery.data && (
            // We still have earlier notes, so show them - but say they may be out of date.
            <p role="status" className="mb-3 flex items-center gap-2 text-sm text-secondary-on-bg">
              <CloudOff aria-hidden className="size-4" />
              Couldn't refresh - showing the last loaded notes.
            </p>
          )}

          {notesQuery.isPending ? (
            <div role="status" aria-label="Loading" className="flex flex-col gap-2">
              {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-16 rounded-card" />)}
            </div>
          ) : notesQuery.isError && !notesQuery.data ? (
            <Card>
              <EmptyState
                tone="error"
                icon={CloudOff}
                title="Couldn't load your notes"
                description={notesQuery.error.message}
                action={
                  <Button variant="secondary" onClick={() => void notesQuery.refetch()}>
                    <RotateCw aria-hidden />
                    Retry
                  </Button>
                }
              />
            </Card>
          ) : notes.length === 0 ? (
            <Card>
              <EmptyState
                icon={NotebookPen}
                title="No notes yet"
                description="Record your first one above, or send a voice note to your Telegram bot."
              />
            </Card>
          ) : (
            <GroupedNoteList notes={notes.slice(0, RECENT_NOTES_LIMIT)} now={now} />
          )}
        </section>
      </div>
    </Page>
  )
}

// The hero of Home: one big, obvious way to start a voice note.
function RecordCard({ onRecord, notesToday }: { onRecord: () => void; notesToday: number }) {
  return (
    <Card className="flex flex-col items-center gap-4 p-6 text-center md:flex-row md:p-8 md:text-left">
      <button
        type="button"
        onClick={onRecord}
        aria-label="Record a note"
        className="grid size-20 shrink-0 cursor-pointer place-items-center rounded-full bg-accent-strong text-on-accent shadow-raised transition-transform hover:brightness-105 active:scale-95"
      >
        <Mic aria-hidden className="size-9" />
      </button>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight">Record a note</h2>
        <p className="mt-1 text-secondary">
          Speak your thought - it's transcribed and titled for you.
          {notesToday > 0 && ` ${notesToday} ${notesToday === 1 ? 'note' : 'notes'} today.`}
        </p>
      </div>
    </Card>
  )
}
