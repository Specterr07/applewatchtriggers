import { RotateCcw } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useUpdateTask } from '@/hooks/useTaskMutations'
import type { Task, TaskChanges } from '@/types/task'
import { notifyError } from '@/utils/notifyError'
import { formatClockTime, formatShortDate, isServerTimestamp, toDatetimeLocal, toServerTimestamp } from '@/utils/time'

type TaskEditFormProps = {
  task: Task
  // The running task, if it's a *different* one - blocks reopening this task.
  otherActiveTask: Task | null
}

// Works out what changed, or returns an error message to show instead.
function buildChanges(task: Task, name: string, start: string, end: string): TaskChanges | string {
  if (!start) return 'Start time is required.'
  const newStart = toServerTimestamp(start)
  const newEnd = end ? toServerTimestamp(end) : null
  if (!isServerTimestamp(newStart) || (newEnd && !isServerTimestamp(newEnd))) {
    return 'Times need a full date and time.'
  }
  // The fixed "YYYY-MM-DD HH:MM:SS" format compares correctly as text.
  if (newEnd && newEnd <= newStart) return 'End must be after start.'

  // Only send what changed (the backend would recalculate duration otherwise).
  const changes: TaskChanges = {}
  if (name.trim() !== task.name) changes.name = name.trim()
  if (newStart !== task.start) changes.start = newStart
  if (newEnd !== task.end) changes.end = newEnd
  return changes
}

// Rename a task and adjust its start/end (spec §4.4). Clearing the end of a
// finished task reopens it - allowed only while nothing else is running.
export function TaskEditForm({ task, otherActiveTask }: TaskEditFormProps) {
  const [name, setName] = useState(task.name)
  const [start, setStart] = useState(toDatetimeLocal(task.start))
  const [end, setEnd] = useState(task.end ? toDatetimeLocal(task.end) : '')
  const [error, setError] = useState<string | null>(null)
  const updateTask = useUpdateTask()

  const isReopening = task.end !== null && !end
  const isDirty =
    name !== task.name || start !== toDatetimeLocal(task.start) || end !== (task.end ? toDatetimeLocal(task.end) : '')

  const resetForm = () => {
    setName(task.name)
    setStart(toDatetimeLocal(task.start))
    setEnd(task.end ? toDatetimeLocal(task.end) : '')
    setError(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const changes = buildChanges(task, name, start, end)
    if (typeof changes === 'string') return setError(changes)
    if (isReopening && otherActiveTask) return setError(`Stop “${otherActiveTask.name}” before reopening this task.`)
    setError(null)
    try {
      await updateTask.mutateAsync({ taskId: task.id, changes, isReopen: isReopening })
      toast.success(isReopening ? 'Task reopened' : 'Changes saved')
    } catch (err) {
      // Keep the user's edits on screen so they can fix and retry.
      notifyError(err)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field label="Name" htmlFor="task-edit-name">
        <Input id="task-edit-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      </Field>
      <Field label="Start" htmlFor="task-edit-start">
        <Input id="task-edit-start" type="datetime-local" step={1} value={start} onChange={(e) => setStart(e.target.value)} />
      </Field>
      <Field label="End" htmlFor={task.end === null || isReopening ? undefined : 'task-edit-end'}>
        {task.end === null || isReopening ? (
          <p className="flex h-11 items-center justify-between gap-2 rounded-control bg-surface-muted px-3 text-secondary-on-bg">
            {isReopening ? 'Reopens as running when saved' : 'Still running'}
            {isReopening && (
              <button type="button" className="cursor-pointer font-medium text-accent-text" onClick={resetForm}>
                Undo
              </button>
            )}
          </p>
        ) : (
          <Input id="task-edit-end" type="datetime-local" step={1} value={end} onChange={(e) => setEnd(e.target.value)} />
        )}
      </Field>

      {isReopening && (
        // The backend reopens by clearing the end time, so the task simply
        // continues its original session - all the time since then counts.
        <p role="note" className="rounded-control border border-border bg-surface-muted px-3 py-2 text-sm text-secondary-on-bg">
          Reopening continues this task’s original session from {formatShortDate(task.date)}, {formatClockTime(task.start)}.
          All the time since then will count towards it. To track new time instead, use <strong className="font-medium text-foreground">Start again</strong>.
        </p>
      )}

      {task.end !== null && !isReopening && (
        <div>
          <Button variant="ghost" className="-ml-3" onClick={() => setEnd('')} disabled={otherActiveTask !== null}>
            <RotateCcw aria-hidden />
            Reopen task
          </Button>
          {otherActiveTask && (
            <p className="text-sm text-secondary">Only one task can run at a time - stop “{otherActiveTask.name}” first.</p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger-text">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={!isDirty || updateTask.isPending}>
          {updateTask.isPending && <Spinner className="text-on-accent" />}
          Save changes
        </Button>
        {isDirty && (
          <Button variant="secondary" onClick={resetForm} disabled={updateTask.isPending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

// A labelled form row. Without `htmlFor` (nothing editable to point at) the
// label is plain text.
function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  const labelClass = 'mb-1.5 block text-sm font-medium'
  return (
    <div>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
        </label>
      ) : (
        <p className={labelClass}>{label}</p>
      )}
      {children}
    </div>
  )
}
