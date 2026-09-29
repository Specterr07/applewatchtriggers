import { TriangleAlert } from 'lucide-react'
import { useEffect } from 'react'
import { useRouteError } from 'react-router'

import { Button } from '@/components/ui/Button'

// Shown instead of a blank screen when a page crashes while rendering, or
// when a lazy screen's code can't be downloaded. The common real-world
// cause of the latter: a new deploy replaced the files an open tab expected,
// which a reload fixes.
export function RouteErrorPage() {
  const error = useRouteError()

  useEffect(() => {
    console.error('Screen failed to render:', error)
  }, [error])

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="flex max-w-sm flex-col items-center text-center">
        <TriangleAlert aria-hidden className="size-8 text-danger-text" />
        <h1 className="mt-4 text-lg font-semibold">Something went wrong</h1>
        <p className="mt-1 text-secondary-on-bg">
          This screen couldn't load. Reloading usually fixes it - especially right after an update.
        </p>
        <Button className="mt-5" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    </div>
  )
}
