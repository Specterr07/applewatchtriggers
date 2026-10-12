import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { createTextNote } from '@/api/notes'
import { QUERY_KEYS } from '@/api/queryClient'
import { Button } from '@/components/ui/Button'
import { ResponsiveDialog } from '@/components/ui/ResponsiveDialog'
import { Spinner } from '@/components/ui/Spinner'
import { notifyError } from '@/utils/notifyError'

type NewNoteSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewNoteSheet({ open, onOpenChange }: NewNoteSheetProps) {
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setText('')
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || isSubmitting) return

    setIsSubmitting(true)
    try {
      const note = await createTextNote(trimmed)
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes })
      toast.success('Note saved')
      handleOpenChange(false)
      navigate(`/notes/${note.id}`)
    } catch (err) {
      notifyError(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange} title="New note">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="new-note-text" className="mb-1.5 block text-sm font-medium">
            Write your note
          </label>
          <textarea
            id="new-note-text"
            autoFocus
            rows={5}
            placeholder="Type your note here... (Markdown supported)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full resize-y rounded-control border border-border bg-surface p-3 text-base text-foreground placeholder:text-secondary focus:border-accent-strong focus:outline-none focus:ring-1 focus:ring-accent-strong"
          />
          <p className="mt-1 text-xs text-secondary">
            Press <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[11px]">⌘+Enter</kbd> or{' '}
            <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[11px]">Ctrl+Enter</kbd> to save.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={!text.trim() || isSubmitting}>
            {isSubmitting ? <Spinner /> : null}
            Save note
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  )
}
