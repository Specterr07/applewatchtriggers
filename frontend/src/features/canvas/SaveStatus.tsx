import { Check, CloudOff } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import type { SaveState } from '@/features/canvas/useCanvasPersistence'

// Small "Saved / Saving… / Save failed" indicator for the canvas header.
// aria-live lets screen readers hear a failed save without moving focus.
export function SaveStatus({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  return (
    <div aria-live="polite" className="flex items-center gap-2 text-sm text-secondary">
      {state === 'unsaved' && <span>Unsaved changes</span>}
      {state === 'saving' && (
        <>
          <Spinner />
          <span>Saving…</span>
        </>
      )}
      {state === 'saved' && (
        <>
          <Check aria-hidden className="size-4 text-success-strong" />
          <span>Saved</span>
        </>
      )}
      {state === 'error' && (
        <>
          <CloudOff aria-hidden className="size-4 text-danger-text" />
          <span className="text-danger-text">Save failed</span>
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </>
      )}
    </div>
  )
}
