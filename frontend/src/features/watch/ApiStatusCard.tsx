import { RotateCw } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'
import { StatusPill } from '@/components/ui/StatusPill'
import { nextPressLabel } from '@/features/watch/shortcut'
import { findActiveTask, useTasks } from '@/hooks/useTasks'
import { useStatus } from '@/hooks/useStatus'
import { formatClockTime } from '@/utils/time'

// What Sheev can actually know about the Watch side (spec §4.9): whether
// the API answers /status, what the next press will do, and the running
// task. It can't know whether the Shortcut is installed, so it never says
// "connected".
export function ApiStatusCard() {
  const statusQuery = useStatus()
  const tasksQuery = useTasks()
  const activeTask = findActiveTask(tasksQuery.data)
  const isChecking = statusQuery.isFetching || tasksQuery.isFetching

  const checkAgain = () => {
    void statusQuery.refetch()
    void tasksQuery.refetch()
  }

  return (
    <section aria-labelledby="api-status-heading">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="api-status-heading" className="text-md font-semibold">
            API status
          </h2>
          {statusQuery.isPending ? (
            <StatusPill tone="neutral" label="Checking…" />
          ) : statusQuery.isError ? (
            <StatusPill tone="error" label="Error" />
          ) : (
            <StatusPill tone="success" label="OK" />
          )}
        </div>

        {statusQuery.isPending ? (
          <div role="status" aria-label="Checking the API" className="mt-4 flex flex-col gap-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>
        ) : statusQuery.isError ? (
          <p role="alert" className="mt-3 text-secondary">
            <span className="font-medium text-danger-text">/status didn't answer: </span>
            {statusQuery.error.message}
          </p>
        ) : (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-secondary">Next press will</dt>
              <dd className="mt-0.5 text-xl font-semibold tracking-tight">{nextPressLabel(statusQuery.data.next_action)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-sm text-secondary">Active task</dt>
              <dd className="mt-0.5">
                {tasksQuery.isError && !tasksQuery.data ? (
                  <span className="text-secondary">Couldn't load tasks</span>
                ) : tasksQuery.isPending ? (
                  <Skeleton className="h-5 w-40" />
                ) : activeTask ? (
                  // min-h-11: a 44px touch target, even though the text is one line.
                  <Link
                    to={`/tasks/${activeTask.id}`}
                    className="flex min-h-11 items-center font-medium text-accent-text underline-offset-2 hover:underline"
                  >
                    <span className="truncate">{activeTask.name}</span>
                  </Link>
                ) : (
                  <span className="text-secondary">None running</span>
                )}
                {activeTask && (
                  <span className="text-sm text-secondary tabular-nums">
                    #{activeTask.id} · started {formatClockTime(activeTask.start)}
                  </span>
                )}
              </dd>
            </div>
          </dl>
        )}

        <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-secondary">
            This only checks that Sheev's API is answering. Sheev can't tell whether the Shortcut is set up on your Watch.
          </p>
          <Button variant="secondary" onClick={checkAgain} disabled={isChecking} className="w-full sm:w-auto">
            {isChecking ? <Spinner /> : <RotateCw aria-hidden />}
            Check again
          </Button>
        </div>
      </Card>
    </section>
  )
}
