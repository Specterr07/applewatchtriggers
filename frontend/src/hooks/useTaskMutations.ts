// Editing and deleting tasks. Every change refetches the shared task list,
// so Home, Tasks and Time Log all update together - whether the request
// succeeded or failed (a failure may mean the list was already out of date).

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { QUERY_KEYS } from '@/api/queryClient'
import { deleteTask, getStatus, updateTask } from '@/api/tasks'
import type { TaskChanges } from '@/types/task'

type UpdateRequest = {
  taskId: number
  changes: TaskChanges
  // True when this edit clears the end time of a finished task.
  isReopen: boolean
}

// PATCH, with one extra safety check: reopening is refused if another task
// is already running, because two open tasks would confuse the Watch's
// /toggle (it only ever acts on the newest open one - spec §4.4).
async function runUpdate({ taskId, changes, isReopen }: UpdateRequest) {
  if (isReopen) {
    const status = await getStatus()
    if (status.next_action === 'End') {
      throw new Error('Another task is running. Stop it before reopening this one.')
    }
  }
  return updateTask(taskId, changes)
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: runUpdate,
    // Not awaited, so the caller can react (close a panel, show a toast)
    // without waiting for the refetch to finish.
    onSettled: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks }),
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTask,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks }),
  })
}
