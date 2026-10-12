import { useQueryClient } from '@tanstack/react-query'
import { RotateCcw, Sparkles } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Drawer } from 'vaul'

import { createTextNote } from '@/api/notes'
import { QUERY_KEYS } from '@/api/queryClient'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { MEDIA_HAS_SIDEBAR } from '@/config'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { notifyError } from '@/utils/notifyError'

const DRAFT_KEY = 'sheev_new_note_draft'

type NewNoteSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewNoteSheet({ open, onOpenChange }: NewNoteSheetProps) {
  const hasSidebar = useMediaQuery(MEDIA_HAS_SIDEBAR)
  const [text, setText] = useState('')
  const [hasDraftRestored, setHasDraftRestored] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Load draft from sessionStorage when opening
  useEffect(() => {
    if (open) {
      try {
        const savedDraft = sessionStorage.getItem(DRAFT_KEY)
        if (savedDraft && savedDraft.trim()) {
          setText(savedDraft)
          setHasDraftRestored(true)
        } else {
          setText('')
          setHasDraftRestored(false)
        }
      } catch {
        setText('')
      }
    }
  }, [open])

  const handleTextChange = (value: string) => {
    setText(value)
    try {
      if (value.trim()) {
        sessionStorage.setItem(DRAFT_KEY, value)
      } else {
        sessionStorage.removeItem(DRAFT_KEY)
      }
    } catch {
      // sessionStorage unavailable
    }
  }

  const clearDraft = () => {
    setText('')
    setHasDraftRestored(false)
    try {
      sessionStorage.removeItem(DRAFT_KEY)
    } catch {}
    textareaRef.current?.focus()
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !text.trim()) {
      try {
        sessionStorage.removeItem(DRAFT_KEY)
      } catch {}
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || isSubmitting) return

    setIsSubmitting(true)
    try {
      const note = await createTextNote(trimmed)
      try {
        sessionStorage.removeItem(DRAFT_KEY)
      } catch {}
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes })
      toast.success('Note saved')
      onOpenChange(false)
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

  // Mobile layout: dedicated full-height experience with pinned top header
  if (!hasSidebar) {
    return (
      <Drawer.Root open={open} onOpenChange={handleOpenChange} autoFocus>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-overlay" />
          <Drawer.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 flex h-[92dvh] max-h-[92dvh] flex-col rounded-t-card border-t border-border bg-surface shadow-raised outline-none pb-[env(safe-area-inset-bottom)]"
          >
            <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border" />

            {/* Sticky Mobile Header: Cancel on left, Title center, Save on right */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3">
              <Button
                variant="ghost"
                size="default"
                className="px-2 text-secondary hover:text-foreground"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Drawer.Title className="text-base font-semibold">New note</Drawer.Title>
              <Button
                size="default"
                className="h-9 px-4 font-medium"
                onClick={() => void handleSubmit()}
                disabled={!text.trim() || isSubmitting}
              >
                {isSubmitting ? <Spinner className="size-4" /> : null}
                Save
              </Button>
            </div>

            {/* Scrollable Writing Area */}
            <div className="flex flex-1 flex-col overflow-y-auto px-4 pt-4 pb-4">
              <textarea
                ref={textareaRef}
                autoFocus
                placeholder="Write your note here..."
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full flex-1 resize-none border-0 bg-transparent p-0 text-base leading-relaxed text-foreground placeholder:text-secondary focus:outline-none focus:ring-0"
              />
            </div>

            {hasDraftRestored && (
              <div className="flex shrink-0 items-center justify-end border-t border-border px-4 py-2">
                <button
                  type="button"
                  onClick={clearDraft}
                  className="inline-flex items-center gap-1 rounded text-xs text-secondary hover:text-danger-text"
                >
                  <RotateCcw className="size-3" /> Clear restored draft
                </button>
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    )
  }

  // Tablet & Desktop layout: Centered Dialog with shortcuts & bottom actions
  return (
    <Dialog open={open} onOpenChange={handleOpenChange} title="New note">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label htmlFor="new-note-text" className="sr-only">
            Write your note
          </label>
          <textarea
            ref={textareaRef}
            id="new-note-text"
            autoFocus
            rows={8}
            placeholder="Write your note here..."
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full resize-y rounded-control border border-border bg-surface p-3 text-base leading-relaxed text-foreground placeholder:text-secondary focus:border-accent-strong focus:outline-none focus:ring-1 focus:ring-accent-strong"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <p className="flex items-center gap-1.5 text-xs text-secondary">
              <Sparkles className="size-3.5 text-accent-text" /> AI title generated on save ·{' '}
              <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[11px]">⌘+Enter</kbd> to save
            </p>
            {hasDraftRestored && (
              <button
                type="button"
                onClick={clearDraft}
                className="inline-flex items-center gap-1 rounded text-xs text-secondary hover:text-danger-text"
              >
                <RotateCcw className="size-3" /> Clear draft
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!text.trim() || isSubmitting}>
              {isSubmitting ? <Spinner /> : null}
              Save note
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
