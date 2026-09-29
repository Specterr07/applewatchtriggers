// Small calculations about tasks, shared by Home, Tasks and Time Log so the
// three screens can never disagree about how long something took.

import type { Task } from '@/types/task'
import { formatClockTime, formatDuration, secondsSince, type WallClock } from '@/utils/time'

// The backend names unnamed tasks like "Task – Fri, 9:00 AM" (see
// services/tasks_db.py generic_title) - a placeholder, not a name the user chose.
const GENERIC_TITLE = /^Task – \w{3}, \d{1,2}:\d{2} [AP]M$/

export function isGenericTitle(name: string): boolean {
  return GENERIC_TITLE.test(name.trim())
}

// Minutes a task has taken so far: its stored duration once finished, or
// the live elapsed time while it's still running.
export function minutesWorked(task: Task, now: WallClock): number {
  if (task.duration_minutes != null) return task.duration_minutes
  if (task.end === null) return secondsSince(task.start, now) / 60
  return 0 // finished but the backend couldn't compute a duration
}

// Total minutes across several tasks.
export function totalMinutes(tasks: Task[], now: WallClock): number {
  return tasks.reduce((total, task) => total + minutesWorked(task, now), 0)
}

// "9:05 AM – 10:10 AM", or "9:05 AM – now" while running.
export function formatTaskTimeRange(task: Task): string {
  return `${formatClockTime(task.start)} – ${task.end ? formatClockTime(task.end) : 'now'}`
}

// A task's duration for display ("42m", "2h 05m"), live while running.
export function formatTaskDuration(task: Task, now: WallClock): string {
  return formatDuration(minutesWorked(task, now))
}
