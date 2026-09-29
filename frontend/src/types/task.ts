// Task shapes from routes/tasks.py (see also static/openapi.yaml).
// Timestamps are server wall-clock strings, "YYYY-MM-DD HH:MM:SS" - handle
// them only through utils/time.ts.

export type Task = {
  id: number
  // The backend fills in "Task – Fri, 9:00 AM" when a task was never named.
  name: string
  date: string // "YYYY-MM-DD" - the day the task started
  start: string
  end: string | null // null while the task is running
  duration_minutes: number | null
}

// What the next /toggle press will do.
export type ToggleAction = 'Start' | 'End'

// GET /api/logs
export type ListTasksResponse = {
  ok: true
  sessions: Task[] // newest first
}

// GET /status
export type StatusResponse = {
  ok: true
  next_action: ToggleAction
}

// GET /toggle
export type ToggleResponse = {
  ok: true
  action: ToggleAction
  id: number
  message: string
}

// PATCH /api/logs/<id> body: any subset of these.
export type TaskChanges = {
  name?: string
  start?: string
  end?: string | null // null reopens the task
}

// PATCH /api/logs/<id>
export type UpdateTaskResponse = {
  ok: true
  task: Task
}
