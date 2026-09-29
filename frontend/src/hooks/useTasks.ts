import { useQuery } from '@tanstack/react-query'

import { QUERY_KEYS } from '@/api/queryClient'
import { listTasks } from '@/api/tasks'
import type { Task } from '@/types/task'

// All tasks (newest first), cached and shared by every screen.
// `refetchIntervalMs` lets a screen that shows live state (Home) also pick
// up changes made elsewhere - e.g. a Watch tap - while it's open. React
// Query pauses the interval while the tab is hidden.
export function useTasks({ refetchIntervalMs }: { refetchIntervalMs?: number } = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.tasks,
    queryFn: listTasks,
    refetchInterval: refetchIntervalMs,
  })
}

// The running task, if any. The list is newest-first and the server only
// ever allows one open task, so the first one without an end is it.
export function findActiveTask(tasks: Task[] | undefined): Task | null {
  return tasks?.find((task) => task.end === null) ?? null
}
