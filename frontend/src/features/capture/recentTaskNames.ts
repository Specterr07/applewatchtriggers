import type { Task } from '@/types/task'
import { isGenericTitle } from '@/utils/tasks'

// Up to `limit` distinct names the user actually typed, most recent first.
// Generic "Task – Fri, 9:00 AM" placeholders aren't worth offering as chips.
export function getRecentTaskNames(tasks: Task[], limit = 5): string[] {
  const names: string[] = []
  for (const task of tasks) {
    const name = task.name.trim()
    if (!name || isGenericTitle(name) || names.includes(name)) continue
    names.push(name)
    if (names.length === limit) break
  }
  return names
}
