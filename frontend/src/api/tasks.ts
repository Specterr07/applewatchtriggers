// Task / Watch endpoints. /toggle and /status are the Apple Watch contract -
// the app only calls them, it never changes how they behave.

import { apiFetch, sendRequest } from '@/api/client'
import type { ListTasksResponse, StatusResponse, Task, TaskChanges, ToggleResponse, UpdateTaskResponse } from '@/types/task'

// Checks a key the user just typed, before it's saved. Uses GET /status
// because it's the cheapest authenticated call and has no side effects.
//
// Only a 401 means "wrong key" - any other reply (even a 500 from a
// database hiccup) proves the key itself was accepted, which is the same
// rule static/index.html uses. Throws ApiError (status 0) if the server
// can't be reached, so the caller can say "offline" instead of "wrong key".
export async function isApiKeyValid(apiKey: string): Promise<boolean> {
  const { status } = await sendRequest('/status', apiKey)
  return status !== 401
}

// Every task, newest first.
export async function listTasks(): Promise<Task[]> {
  const data = await apiFetch<ListTasksResponse>('/api/logs')
  return data.sessions
}

// What the next /toggle would do, without doing it.
export function getStatus(): Promise<StatusResponse> {
  return apiFetch<StatusResponse>('/status')
}

// Starts or ends the current task - whichever the server decides. Don't
// call this directly from UI code: use hooks/useGuardedToggle, which checks
// /status first so a stale screen can't flip the wrong way.
//
// `name` is only for starting a task. Never pass it when stopping: /toggle
// on End overwrites the task's name with whatever it's given.
export function toggleTask(name?: string): Promise<ToggleResponse> {
  const query = name ? `?name=${encodeURIComponent(name)}` : ''
  return apiFetch<ToggleResponse>(`/toggle${query}`)
}

// Edits a task. Send only the fields that changed (the backend recalculates
// the duration when start/end change). `end: null` reopens a finished task.
export async function updateTask(taskId: number, changes: TaskChanges): Promise<Task> {
  const data = await apiFetch<UpdateTaskResponse>(`/api/logs/${taskId}`, { method: 'PATCH', body: changes })
  return data.task
}

// Permanently deletes a task.
export async function deleteTask(taskId: number): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/logs/${taskId}`, { method: 'DELETE' })
}
