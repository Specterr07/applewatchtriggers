// Start / Stop without ever flipping the wrong way (spec §4.3).
//
// /toggle simply flips whatever the current state is - the Watch relies on
// that. But a screen can be out of date (the Watch started a task a minute
// ago) or a button can be double-tapped. So before toggling we ask /status
// what the next press would do, and only go ahead if it matches what the
// user saw; then we check what /toggle actually did.

import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { QUERY_KEYS } from '@/api/queryClient'
import { getStatus, toggleTask } from '@/api/tasks'
import type { Task, ToggleAction, ToggleResponse } from '@/types/task'
import { notifyError } from '@/utils/notifyError'
import { formatDuration } from '@/utils/time'

// Shared by every Start/Stop button, so one pending toggle disables them all
// (Home's Stop and the Capture sheet's Stop can't both fire).
const TOGGLE_MUTATION_KEY = ['toggle'] as const

type ToggleRequest = {
  action: ToggleAction
  name?: string // only used when starting
}

// The server's state didn't match what the user tapped.
class ToggleConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ToggleConflictError'
  }
}

// Explains a mismatch, depending on whether /toggle had already run.
function conflictMessage(serverAction: ToggleAction, alreadyToggled: boolean): string {
  if (alreadyToggled) {
    // Rare race: something else toggled between our /status check and our
    // /toggle call, so our call did the opposite of what was tapped.
    return serverAction === 'End'
      ? 'The task changed at that exact moment, so this tap stopped the running task instead.'
      : 'The task changed at that exact moment, so this tap started a new task instead.'
  }
  return serverAction === 'End'
    ? 'A task was already started elsewhere (e.g. your Watch). Showing the latest state.'
    : 'That task was already stopped elsewhere (e.g. your Watch). Showing the latest state.'
}

// The status -> toggle -> verify sequence itself.
async function runGuardedToggle({ action, name }: ToggleRequest): Promise<ToggleResponse> {
  const status = await getStatus()
  if (status.next_action !== action) {
    throw new ToggleConflictError(conflictMessage(status.next_action, false))
  }
  // Stop must never send a name: /toggle on End would rename the task.
  const result = await toggleTask(action === 'Start' ? name?.trim() || undefined : undefined)
  if (result.action !== action) {
    throw new ToggleConflictError(conflictMessage(result.action, true))
  }
  return result
}

export function useGuardedToggle() {
  const queryClient = useQueryClient()

  // Refetches the task list so every screen shows the real state. Resolves
  // once the fresh list is in the cache.
  const refreshTasks = () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks })

  const isAnyTogglePending = useIsMutating({ mutationKey: TOGGLE_MUTATION_KEY }) > 0

  const mutation = useMutation({
    mutationKey: TOGGLE_MUTATION_KEY,
    mutationFn: runGuardedToggle,
    onSuccess: async (result) => {
      await refreshTasks()
      const task = queryClient.getQueryData<Task[]>(QUERY_KEYS.tasks)?.find((t) => t.id === result.id)
      if (result.action === 'Start') {
        toast.success(task ? `Started “${task.name}”` : 'Task started')
      } else {
        const duration = task?.duration_minutes
        toast.success(duration != null ? `Stopped after ${formatDuration(duration)}` : 'Task stopped')
      }
    },
    onError: async (error) => {
      await refreshTasks()
      if (error instanceof ToggleConflictError) toast.info(error.message)
      else notifyError(error)
    },
  })

  // Resolves to true if the toggle happened as requested. Never throws -
  // failures are reported to the user as toasts above.
  const toggle = (request: ToggleRequest): Promise<boolean> =>
    mutation.mutateAsync(request).then(
      () => true,
      () => false,
    )

  return { toggle, isPending: isAnyTogglePending }
}
