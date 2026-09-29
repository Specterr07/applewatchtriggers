import { CloudOff, Play, SearchX, Square, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'
import { TaskEditForm } from '@/features/tasks/TaskEditForm'
import { TaskStatus } from '@/features/tasks/TaskStatus'
import { useGuardedToggle } from '@/hooks/useGuardedToggle'
import { useNow } from '@/hooks/useNow'
import { useDeleteTask } from '@/hooks/useTaskMutations'
import { findActiveTask, useTasks } from '@/hooks/useTasks'
import { notifyError } from '@/utils/notifyError'
import { formatTaskDuration, formatTaskTimeRange, isGenericTitle } from '@/utils/tasks'
import { formatDayHeading } from '@/utils/time'

// Everything about one task: what it is, when, how long - plus Stop /
// Start again, editing and delete. Reads from the shared task list (no
// separate copy), so it always agrees with Home and Time Log.
export function TaskDetail({ taskId, onClose }: { taskId: number; onClose: () => void }) {
  const tasksQuery = useTasks()
  const task = tasksQuery.data?.find((t) => t.id === taskId)
  const activeTask = findActiveTask(tasksQuery.data)
  const now = useNow(task?.end === null ? 1000 : 60_000)
  const { toggle, isPending: isToggling } = useGuardedToggle()
  const deleteTask = useDeleteTask()
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  if (tasksQuery.isPending) {
    return (
      <div role="status" aria-label="Loading" className="flex flex-col gap-4 p-5">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-40" />
      </div>
    )
  }
  if (!task) {
    return tasksQuery.isError ? (
      <EmptyState tone="error" icon={CloudOff} title="Couldn't load this task" description={tasksQuery.error.message}
        action={<Button variant="secondary" onClick={() => void tasksQuery.refetch()}>Retry</Button>} />
    ) : (
      <EmptyState icon={SearchX} title="Task not found" description="It may have been deleted."
        action={<Button variant="secondary" onClick={onClose}>Back to tasks</Button>} />
    )
  }

  const isRunning = task.end === null
  const otherActiveTask = activeTask && activeTask.id !== task.id ? activeTask : null

  const startAgain = async () => {
    // A generic "Task – Fri, 9:00 AM" title isn't a real name, so don't copy it.
    const started = await toggle({ action: 'Start', name: isGenericTitle(task.name) ? undefined : task.name })
    if (started) onClose()
  }

  const confirmDelete = async () => {
    try {
      await deleteTask.mutateAsync(task.id)
      setIsConfirmingDelete(false)
      onClose()
      toast.success('Task deleted')
    } catch (err) {
      // Nothing was deleted - say so and leave the task on screen.
      setIsConfirmingDelete(false)
      notifyError(err)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-5">
      <section aria-label="Summary">
        <div className="flex items-center justify-between gap-3">
          <TaskStatus task={task} />
          <span className="text-sm text-secondary tabular-nums">#{task.id}</span>
        </div>
        <h2 className="mt-3 text-lg font-semibold tracking-tight break-words">{task.name}</h2>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{formatTaskDuration(task, now)}</p>
        <p className="mt-1 text-secondary">
          {formatDayHeading(task.date, now)} · {formatTaskTimeRange(task)}
        </p>

        {isRunning ? (
          <Button className="mt-4 w-full sm:w-auto" onClick={() => void toggle({ action: 'End' })} disabled={isToggling}>
            {isToggling ? <Spinner className="text-on-accent" /> : <Square aria-hidden />}
            Stop
          </Button>
        ) : (
          !activeTask && (
            <Button variant="secondary" className="mt-4 w-full sm:w-auto" onClick={() => void startAgain()} disabled={isToggling}>
              {isToggling ? <Spinner /> : <Play aria-hidden />}
              Start again
            </Button>
          )
        )}
      </section>

      <section aria-labelledby="edit-heading" className="border-t border-border pt-5">
        <h3 id="edit-heading" className="mb-4 text-md font-semibold">Edit</h3>
        {/* Remounts when the saved task changes, so the fields show fresh values. */}
        <TaskEditForm key={`${task.name}|${task.start}|${task.end}`} task={task} otherActiveTask={otherActiveTask} />
      </section>

      <section className="border-t border-border pt-5">
        <Button variant="secondary" className="text-danger-text" onClick={() => setIsConfirmingDelete(true)}>
          <Trash2 aria-hidden />
          Delete task
        </Button>
      </section>

      <ConfirmDialog
        open={isConfirmingDelete}
        onOpenChange={setIsConfirmingDelete}
        title="Delete this task?"
        description={isRunning ? 'This task is still running. Deleting it can’t be undone.' : `“${task.name}” will be permanently deleted. This can’t be undone.`}
        confirmLabel="Delete task"
        onConfirm={() => void confirmDelete()}
        isPending={deleteTask.isPending}
      />
    </div>
  )
}
