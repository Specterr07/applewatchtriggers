import { CloudOff, ListChecks, Play, SearchX } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { MEDIA_DESKTOP } from '@/config'
import { useCapture } from '@/features/capture/CaptureProvider'
import { TaskCardList } from '@/features/tasks/TaskCardList'
import { TaskTable } from '@/features/tasks/TaskTable'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useNow } from '@/hooks/useNow'
import type { useTasks } from '@/hooks/useTasks'
import type { Task } from '@/types/task'

type TaskResultsProps = {
  tasksQuery: ReturnType<typeof useTasks>
  filteredTasks: Task[]
  visibleCount: number
  onShowMore: () => void
  hasFilters: boolean
  onClearFilters: () => void
}

// The list part of the Tasks screen: loading / error / empty states, then
// cards (phone, tablet) or a table (desktop), then "Show more".
export function TaskResults({ tasksQuery, filteredTasks, visibleCount, onShowMore, hasFilters, onClearFilters }: TaskResultsProps) {
  const isDesktop = useMediaQuery(MEDIA_DESKTOP)
  const { openStartTask } = useCapture()
  // Durations of a running task are shown to the minute, so a slow tick is enough.
  const now = useNow(30_000)

  if (tasksQuery.isPending) {
    return (
      <div role="status" aria-label="Loading" className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-16 rounded-card" />)}
      </div>
    )
  }
  if (tasksQuery.isError && !tasksQuery.data) {
    return (
      <Card>
        <EmptyState tone="error" icon={CloudOff} title="Couldn't load your tasks" description={tasksQuery.error.message}
          action={<Button variant="secondary" onClick={() => void tasksQuery.refetch()}>Retry</Button>} />
      </Card>
    )
  }
  if (filteredTasks.length === 0) {
    return (
      <Card>
        {hasFilters ? (
          <EmptyState icon={SearchX} title="No matching tasks" description="Try a different search or filter."
            action={<Button variant="secondary" onClick={onClearFilters}>Clear filters</Button>} />
        ) : (
          <EmptyState icon={ListChecks} title="No tasks yet" description="Start one here, or tap your Apple Watch."
            action={<Button onClick={openStartTask}><Play aria-hidden />Start a task</Button>} />
        )}
      </Card>
    )
  }

  const visibleTasks = filteredTasks.slice(0, visibleCount)
  const hiddenCount = filteredTasks.length - visibleTasks.length

  return (
    <div className="flex flex-col gap-4">
      {isDesktop ? <TaskTable tasks={visibleTasks} now={now} /> : <TaskCardList tasks={visibleTasks} now={now} />}
      <div className="flex flex-col items-center gap-2 text-sm text-secondary-on-bg">
        <p>
          Showing {visibleTasks.length} of {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
        </p>
        {hiddenCount > 0 && (
          <Button variant="secondary" onClick={onShowMore}>
            Show more
          </Button>
        )}
      </div>
    </div>
  )
}
