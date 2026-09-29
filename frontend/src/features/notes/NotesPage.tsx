import { CloudOff, Mic, NotebookPen, SearchX } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'

import { DetailScreen } from '@/components/layout/DetailScreen'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchInput } from '@/components/ui/SearchInput'
import { Skeleton } from '@/components/ui/Skeleton'
import { MEDIA_HAS_SIDEBAR } from '@/config'
import { useCapture } from '@/features/capture/CaptureProvider'
import { NoteDetail } from '@/features/notes/NoteDetail'
import { NoteList } from '@/features/notes/NoteList'
import { filterNotes, getNotesViewState } from '@/features/notes/noteText'
import { useCloseDetail } from '@/hooks/useCloseDetail'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useNotes } from '@/hooks/useNotes'
import { useNow } from '@/hooks/useNow'

// Voice notes (spec §4.6): record, search what's loaded, open one to play,
// read and delete it. /notes/:noteId opens a note - a drawer with a
// sidebar (same pattern as tasks), a full screen on phones.
export function NotesPage() {
  const { noteId } = useParams()
  const selectedNoteId = noteId ? Number(noteId) : null
  const hasSidebar = useMediaQuery(MEDIA_HAS_SIDEBAR)
  const closeDetail = useCloseDetail('/notes')
  const { openRecorder } = useCapture()
  const notesQuery = useNotes()
  const now = useNow(60_000)
  const [query, setQuery] = useState('')

  if (selectedNoteId !== null && !hasSidebar) {
    return (
      <DetailScreen title="Note" onBack={closeDetail}>
        <NoteDetail noteId={selectedNoteId} onClose={closeDetail} />
      </DetailScreen>
    )
  }

  const matches = filterNotes(notesQuery.data ?? [], query)
  const viewState = getNotesViewState({ isPending: notesQuery.isPending, isError: notesQuery.isError, notes: notesQuery.data, matches })
  const recordButton = <Button onClick={openRecorder}><Mic aria-hidden />Record</Button>

  return (
    <Page title="Notes" description="Voice notes, transcribed - from here or Telegram." actions={recordButton}>
      {(viewState === 'list' || viewState === 'no-matches') && (
        <div className="mb-4">
          <SearchInput value={query} onChange={setQuery} label="Search notes" placeholder="Search transcripts" />
        </div>
      )}
      {notesQuery.isError && notesQuery.data && (
        <p role="status" className="mb-4 flex items-center gap-2 text-sm text-secondary-on-bg">
          <CloudOff aria-hidden className="size-4" /> Couldn't refresh - showing the last loaded notes.
        </p>
      )}

      {viewState === 'loading' && (
        <div role="status" aria-label="Loading" className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-16 rounded-card" />)}
        </div>
      )}
      {viewState === 'error' && (
        <Card>
          <EmptyState tone="error" icon={CloudOff} title="Couldn't load your notes" description={notesQuery.error?.message}
            action={<Button variant="secondary" onClick={() => void notesQuery.refetch()}>Retry</Button>} />
        </Card>
      )}
      {viewState === 'empty' && (
        <Card>
          <EmptyState icon={NotebookPen} title="No notes yet" description="Record one here, or send a voice note to your Telegram bot." action={recordButton} />
        </Card>
      )}
      {viewState === 'no-matches' && (
        <Card>
          <EmptyState icon={SearchX} title="No matching notes" description="Search looks through transcripts."
            action={<Button variant="secondary" onClick={() => setQuery('')}>Clear search</Button>} />
        </Card>
      )}
      {viewState === 'list' && <NoteList notes={matches} now={now} />}

      {hasSidebar && selectedNoteId !== null && (
        <Drawer open onOpenChange={(open) => !open && closeDetail()} title="Note">
          <NoteDetail noteId={selectedNoteId} onClose={closeDetail} />
        </Drawer>
      )}
    </Page>
  )
}
