import { StatusPill } from '@/components/ui/StatusPill'
import type { Task } from '@/types/task'

// "Running" or "Completed" for a task (a running task has no end yet).
export function TaskStatus({ task }: { task: Task }) {
  return task.end === null ? <StatusPill tone="running" label="Running" /> : <StatusPill tone="neutral" label="Completed" />
}
