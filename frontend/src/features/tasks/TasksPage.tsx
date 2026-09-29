import { Play } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'

import { DetailScreen } from '@/components/layout/DetailScreen'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { SearchInput } from '@/components/ui/SearchInput'
import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl'
import { MEDIA_HAS_SIDEBAR } from '@/config'
import { useCapture } from '@/features/capture/CaptureProvider'
import { TaskDetail } from '@/features/tasks/TaskDetail'
import { filterTasks, TASKS_PAGE_SIZE, type TaskStatusFilter } from '@/features/tasks/taskFilters'
import { TaskResults } from '@/features/tasks/TaskResults'
import { useCloseDetail } from '@/hooks/useCloseDetail'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { findActiveTask, useTasks } from '@/hooks/useTasks'

const STATUS_OPTIONS: SegmentOption<TaskStatusFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

// Tasks = WHAT you worked on (spec §4.2): every timed task, searchable and
// filterable. /tasks/:taskId opens one task - in a drawer over the list
// where there's a sidebar, as a full screen on phones.
export function TasksPage() {
  const { taskId } = useParams()
  const selectedTaskId = taskId ? Number(taskId) : null
  const hasSidebar = useMediaQuery(MEDIA_HAS_SIDEBAR)
  const closeDetail = useCloseDetail('/tasks')
  const { openStartTask } = useCapture()

  const tasksQuery = useTasks()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<TaskStatusFilter>('all')
  const [visibleCount, setVisibleCount] = useState(TASKS_PAGE_SIZE)

  // Any change to what's being searched starts the list from the top again.
  const updateQuery = (value: string) => {
    setQuery(value)
    setVisibleCount(TASKS_PAGE_SIZE)
  }
  const updateStatus = (value: TaskStatusFilter) => {
    setStatus(value)
    setVisibleCount(TASKS_PAGE_SIZE)
  }

  if (selectedTaskId !== null && !hasSidebar) {
    return (
      <DetailScreen title={`Task #${selectedTaskId}`} onBack={closeDetail}>
        <TaskDetail taskId={selectedTaskId} onClose={closeDetail} />
      </DetailScreen>
    )
  }

  const hasActiveTask = findActiveTask(tasksQuery.data) !== null

  return (
    <Page
      title="Tasks"
      description="Everything you've timed, from the Watch or here."
      actions={!hasActiveTask && tasksQuery.data && (
        <Button variant="secondary" onClick={openStartTask}>
          <Play aria-hidden />
          Start a task
        </Button>
      )}
    >
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="md:flex-1">
          <SearchInput value={query} onChange={updateQuery} label="Search tasks" placeholder="Search by name or #id" />
        </div>
        <div className="md:w-80">
          <SegmentedControl name="task-status" label="Show" options={STATUS_OPTIONS} value={status} onChange={updateStatus} />
        </div>
      </div>

      <TaskResults
        tasksQuery={tasksQuery}
        filteredTasks={filterTasks(tasksQuery.data ?? [], query, status)}
        visibleCount={visibleCount}
        onShowMore={() => setVisibleCount((count) => count + TASKS_PAGE_SIZE)}
        hasFilters={query.trim() !== '' || status !== 'all'}
        onClearFilters={() => {
          updateQuery('')
          setStatus('all')
        }}
      />

      {hasSidebar && selectedTaskId !== null && (
        <Drawer open onOpenChange={(open) => !open && closeDetail()} title={`Task #${selectedTaskId}`}>
          <TaskDetail taskId={selectedTaskId} onClose={closeDetail} />
        </Drawer>
      )}
    </Page>
  )
}
