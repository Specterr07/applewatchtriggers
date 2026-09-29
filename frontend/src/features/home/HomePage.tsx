import { CloudOff, Plus, RotateCw } from 'lucide-react'

import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCapture } from '@/features/capture/CaptureProvider'
import { ActiveSessionCard } from '@/features/home/ActiveSessionCard'
import { buildRecentActivity, computeTodayStats } from '@/features/home/homeStats'
import { RecentActivity } from '@/features/home/RecentActivity'
import { TodayStats } from '@/features/home/TodayStats'
import { useGuardedToggle } from '@/hooks/useGuardedToggle'
import { useNotes } from '@/hooks/useNotes'
import { useNow } from '@/hooks/useNow'
import { findActiveTask, useTasks } from '@/hooks/useTasks'
import { formatLongDate, greetingFor } from '@/utils/time'

// Home also refreshes on this interval (only while the tab is visible), so
// a task started or stopped from the Watch shows up within a minute.
const HOME_REFRESH_MS = 60_000

// Home / Overview (spec §5.3): the running task, today's numbers, recent activity.
export function HomePage() {
  const tasksQuery = useTasks({ refetchIntervalMs: HOME_REFRESH_MS })
  const notesQuery = useNotes()
  const activeTask = findActiveTask(tasksQuery.data)
  // Tick every second only while a timer is on screen; otherwise just keep
  // the greeting and "today" current.
  const now = useNow(activeTask ? 1000 : 30_000)
  const { toggle, isPending } = useGuardedToggle()
  const { openCapture, openStartTask } = useCapture()

  const header = {
    title: greetingFor(now.hour),
    description: formatLongDate(now),
    // Phones already have Capture in the bottom nav, so this is tablet/desktop only.
    actions: (
      <Button variant="secondary" onClick={openCapture} className="hidden md:inline-flex">
        <Plus aria-hidden />
        Capture
      </Button>
    ),
  }

  if (tasksQuery.isPending) {
    return (
      <Page {...header}>
        <HomeSkeleton />
      </Page>
    )
  }

  if (tasksQuery.isError && !tasksQuery.data) {
    return (
      <Page {...header}>
        <Card>
          <EmptyState
            tone="error"
            icon={CloudOff}
            title="Couldn't load your tasks"
            description={tasksQuery.error.message}
            action={<RetryButton onClick={() => void tasksQuery.refetch()} />}
          />
        </Card>
      </Page>
    )
  }

  const tasks = tasksQuery.data
  const stats = computeTodayStats(tasks, notesQuery.data, now)
  const events = buildRecentActivity(tasks, notesQuery.data)

  return (
    <Page {...header}>
      {tasksQuery.isError && (
        // We still have earlier data, so show it - but say it may be out of date.
        <p role="status" className="mb-4 flex items-center gap-2 text-sm text-secondary-on-bg">
          <CloudOff aria-hidden className="size-4" />
          Couldn't refresh - showing the last loaded data.
          <button type="button" className="cursor-pointer font-medium text-accent-text" onClick={() => void tasksQuery.refetch()}>
            Retry
          </button>
        </p>
      )}

      {/* Phones: session, today, activity. Desktop: session and activity in a
          wide column, today's numbers in a narrow column beside them. */}
      <div className="grid gap-6 lg:grid-cols-3 lg:grid-rows-[auto_1fr] lg:gap-x-8">
        <div className="lg:col-span-2">
          <ActiveSessionCard
            activeTask={activeTask}
            now={now}
            isPending={isPending}
            onStart={openStartTask}
            onStop={() => void toggle({ action: 'End' })}
          />
        </div>
        <div className="lg:col-start-3 lg:row-span-2 lg:row-start-1">
          <TodayStats stats={stats} />
        </div>
        <div className="lg:col-span-2">
          <RecentActivity
            events={events}
            now={now}
            footer={
              notesQuery.isError && (
                <p className="flex items-center gap-2 border-t border-border px-4 py-3 text-sm text-secondary">
                  Voice notes couldn't be loaded.
                  <button type="button" className="cursor-pointer font-medium text-accent-text" onClick={() => void notesQuery.refetch()}>
                    Retry
                  </button>
                </p>
              )
            }
          />
        </div>
      </div>
    </Page>
  )
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="secondary" onClick={onClick}>
      <RotateCw aria-hidden />
      Retry
    </Button>
  )
}

// Grey placeholders in the same layout, so the page doesn't jump when data arrives.
function HomeSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="grid gap-6 lg:grid-cols-3 lg:gap-x-8">
      <Skeleton className="h-44 rounded-card lg:col-span-2" />
      <div className="grid grid-cols-3 gap-3 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:grid-cols-1">
        <Skeleton className="h-20 rounded-card" />
        <Skeleton className="h-20 rounded-card" />
        <Skeleton className="h-20 rounded-card" />
      </div>
      <Skeleton className="h-72 rounded-card lg:col-span-2" />
    </div>
  )
}
