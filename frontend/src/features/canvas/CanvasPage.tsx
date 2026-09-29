// The tldraw canvas screen. Loaded lazily (see router.tsx), so tldraw's
// large bundle is only downloaded when someone actually opens /canvas.

import { ChevronLeft, TriangleAlert } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { SaveStatus } from '@/features/canvas/SaveStatus'
import { useCanvasPersistence } from '@/features/canvas/useCanvasPersistence'
import { useTheme } from '@/hooks/useTheme'

// Default export because React.lazy() requires one.
export default function CanvasPage() {
  const { editor, loadState, saveState, handleMount, retryLoad, saveNow } = useCanvasPersistence()
  const { resolvedTheme } = useTheme()
  const navigate = useNavigate()

  // Keep tldraw's own light/dark UI in step with the app theme.
  useEffect(() => {
    editor?.user.updateUserPreferences({ colorScheme: resolvedTheme })
  }, [editor, resolvedTheme])

  // Phones have no nav on this screen, so Back returns to wherever you came
  // from - including the old app, which links here via /canvas.
  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-border bg-surface px-2 md:px-4">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={goBack} className="md:hidden">
          <ChevronLeft aria-hidden className="size-5!" />
        </Button>
        <h1 className="text-md font-semibold">Canvas</h1>
        <div className="ml-auto">
          <SaveStatus state={saveState} onRetry={() => void saveNow()} />
        </div>
      </header>

      <div className="relative flex-1">
        <div className="absolute inset-0">
          <Tldraw onMount={handleMount} />
        </div>

        {loadState !== 'ready' && (
          // Covers the canvas until the saved drawing is in, so nothing can
          // be drawn (and then saved over the real canvas) too early.
          <div className="absolute inset-0 z-[1000] grid place-items-center bg-background">
            {loadState === 'loading' ? (
              <Spinner label="Loading canvas" />
            ) : (
              <div role="alert" className="flex flex-col items-center gap-3 text-center">
                <TriangleAlert aria-hidden className="size-6 text-danger-text" />
                <p>Couldn't load your saved canvas.</p>
                <Button onClick={retryLoad}>Retry</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
