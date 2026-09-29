// Time Log calculations (spec §5.3): pick a date range, group by day, total
// each day. A task belongs to the day it *started* (the backend's `date`
// field), so a session that runs past midnight counts in full on its start day.

import type { Task } from '@/types/task'
import { totalMinutes } from '@/utils/tasks'
import { shiftDateKey, toDateKey, type WallClock } from '@/utils/time'

export type TimeRange = 'today' | '7d' | '30d' | 'all'

export type DayGroup = {
  dateKey: string // "YYYY-MM-DD"
  tasks: Task[] // newest start first
  totalMinutes: number
}

// How many days back (including today) each range covers.
const RANGE_DAYS: Record<Exclude<TimeRange, 'all'>, number> = { today: 1, '7d': 7, '30d': 30 }

// Tasks that started within the range, ending today (server timezone).
export function filterByRange(tasks: Task[], range: TimeRange, now: WallClock): Task[] {
  if (range === 'all') return tasks
  const firstDay = shiftDateKey(toDateKey(now), -(RANGE_DAYS[range] - 1))
  // "YYYY-MM-DD" keys compare correctly as plain strings.
  return tasks.filter((task) => task.date >= firstDay)
}

// Groups tasks by start day, newest day first, each with its total time.
export function groupByDay(tasks: Task[], now: WallClock): DayGroup[] {
  const byDay = new Map<string, Task[]>()
  for (const task of tasks) {
    byDay.set(task.date, [...(byDay.get(task.date) ?? []), task])
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, dayTasks]) => {
      const sorted = [...dayTasks].sort((a, b) => b.start.localeCompare(a.start))
      return { dateKey, tasks: sorted, totalMinutes: totalMinutes(sorted, now) }
    })
}
