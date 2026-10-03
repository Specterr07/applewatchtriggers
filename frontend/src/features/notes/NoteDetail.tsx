import { Check, CloudOff, Copy, Pencil, SearchX, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { NotePlayer } from '@/features/notes/NoteAudio'
import { getNoteTitle, hasRealTitle } from '@/features/notes/noteText'
import { useDeleteNote } from '@/hooks/useDeleteNote'
import { useNotes } from '@/hooks/useNotes'
import { useNow } from '@/hooks/useNow'
import { useRenameNote } from '@/hooks/useRenameNote'
import type { Note } from '@/types/note'
import { cn } from '@/utils/cn'
import { notifyError } from '@/utils/notifyError'
import { formatClockTime, formatDayHeading } from '@/utils/time'

// One note: its title (editable), when it was recorded, its audio, its
// full transcript, and delete.
// Read from the shared notes list (there's no single-note endpoint).
export function NoteDetail({ noteId, onClose }: { noteId: number; onClose: () => void }) {
  const notesQuery = useNotes()
  const note = notesQuery.data?.find((n) => n.id === noteId)
  const now = useNow(60_000)
  const deleteNote = useDeleteNote()
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  if (notesQuery.isPending) {
    return (
      <div role="status" aria-label="Loading" className="flex flex-col gap-4 p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-11" />
        <Skeleton className="h-32" />
      </div>
    )
  }
  if (!note) {
    return notesQuery.isError ? (
      <EmptyState tone="error" icon={CloudOff} title="Couldn't load this note" description={notesQuery.error.message}
        action={<Button variant="secondary" onClick={() => void notesQuery.refetch()}>Retry</Button>} />
    ) : (
      <EmptyState icon={SearchX} title="Note not found" description="It may have been deleted."
        action={<Button variant="secondary" onClick={onClose}>Back to notes</Button>} />
    )
  }

  const copyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(note.transcript)
      toast.success('Transcript copied')
    } catch {
      // Clipboard access can be refused (permissions, non-secure page).
      toast.error('Couldn’t copy - select the text and copy it instead.')
    }
  }

  const confirmDelete = async () => {
    try {
      await deleteNote.mutateAsync(note.id)
      setIsConfirmingDelete(false)
      onClose()
      toast.success('Note deleted')
    } catch (err) {
      // Nothing was deleted - say so and keep the note on screen.
      setIsConfirmingDelete(false)
      notifyError(err)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-5">
      <section aria-label="Recording" className="flex flex-col gap-3">
        <NoteTitle key={note.id} note={note} />
        <p className="text-secondary">
          {formatDayHeading(note.created_at.slice(0, 10), now)} · {formatClockTime(note.created_at)}
        </p>
        <NotePlayer key={note.id} note={note} />
      </section>

      <section aria-labelledby="transcript-heading" className="border-t border-border pt-5">
        <h2 id="transcript-heading" className="mb-2 text-md font-semibold">Transcript</h2>
        <p className="text-md break-words whitespace-pre-wrap">
          {note.transcript.trim() || <span className="text-secondary">No speech was detected.</span>}
        </p>
        {note.transcript.trim() && (
          <Button variant="secondary" className="mt-4" onClick={() => void copyTranscript()}>
            <Copy aria-hidden />
            Copy transcript
          </Button>
        )}
      </section>

      <section className="border-t border-border pt-5">
        <Button variant="secondary" className="text-danger-text" onClick={() => setIsConfirmingDelete(true)}>
          <Trash2 aria-hidden />
          Delete note
        </Button>
      </section>

      <ConfirmDialog
        open={isConfirmingDelete}
        onOpenChange={setIsConfirmingDelete}
        title="Delete this note?"
        description="The transcript and its audio recording will be permanently deleted. This can’t be undone."
        confirmLabel="Delete note"
        onConfirm={() => void confirmDelete()}
        isPending={deleteNote.isPending}
      />
    </div>
  )
}

// The note's title as a heading, with a pencil to rename it. Saving an
// empty title clears it, so the first words of the transcript show instead.
function NoteTitle({ note }: { note: Note }) {
  const renameNote = useRenameNote()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const startEditing = () => {
    setDraft(note.title ?? '')
    setIsEditing(true)
  }

  const save = async () => {
    if (draft.trim() === (note.title ?? '').trim()) {
      setIsEditing(false)
      return
    }
    try {
      await renameNote.mutateAsync({ noteId: note.id, title: draft })
      setIsEditing(false)
      toast.success(draft.trim() ? 'Title saved' : 'Title cleared')
    } catch (err) {
      // Nothing changed on the server - keep the edit box open with the draft.
      notifyError(err)
    }
  }

  if (isEditing) {
    return (
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <Input
          autoFocus
          aria-label="Note title"
          value={draft}
          maxLength={120}
          placeholder={getNoteTitle({ title: null, transcript: note.transcript })}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => event.key === 'Escape' && setIsEditing(false)}
          disabled={renameNote.isPending}
        />
        <Button type="submit" size="icon" aria-label="Save title" disabled={renameNote.isPending}>
          <Check aria-hidden />
        </Button>
        <Button variant="secondary" size="icon" aria-label="Cancel" onClick={() => setIsEditing(false)} disabled={renameNote.isPending}>
          <X aria-hidden />
        </Button>
      </form>
    )
  }

  return (
    <div className="flex items-start gap-2">
      {/* Greyed when it's only the transcript's first words, not a real title. */}
      <h2 className={cn('min-w-0 flex-1 text-lg font-semibold tracking-tight break-words', !hasRealTitle(note) && 'text-secondary')}>
        {getNoteTitle(note)}
      </h2>
      <Button variant="ghost" size="icon" aria-label="Rename note" onClick={startEditing}>
        <Pencil aria-hidden />
      </Button>
    </div>
  )
}
