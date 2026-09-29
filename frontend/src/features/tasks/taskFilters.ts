import type { Task } from '@/types/task'

export type TaskStatusFilter = 'all' | 'active' | 'completed'

// How many tasks the list shows at first, and adds per "Show more". This is
// client-side progressive display of the full /api/logs response - the API
// itself isn't paginated (spec §5.3).
export const TASKS_PAGE_SIZE = 50

// Tasks matching the search text and status filter, most recently started
// first. (/api/logs is ordered by id, which drifts from start order once a
// task's start time is edited.) Search matches the name (case-insensitive),
// or the id: "12" / "#12".
export function filterTasks(tasks: Task[], query: string, status: TaskStatusFilter): Task[] {
  const needle = query.trim().toLowerCase()
  const idNeedle = needle.replace(/^#/, '')

  const byNewestStart = [...tasks].sort((a, b) => b.start.localeCompare(a.start) || b.id - a.id)
  return byNewestStart.filter((task) => {
    if (status === 'active' && task.end !== null) return false
    if (status === 'completed' && task.end === null) return false
    if (!needle) return true
    return task.name.toLowerCase().includes(needle) || String(task.id) === idNeedle
  })
}
