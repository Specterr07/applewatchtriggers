import { describe, expect, it } from 'vitest'

import { computeTodayStats } from '@/features/home/homeStats'
import { filterByRange, groupByDay } from '@/features/timelog/timeLog'
import type { Task } from '@/types/task'
import { parseServerTimestamp, shiftDateKey } from '@/utils/time'

const NOW = parseServerTimestamp('2026-10-01 00:30:00') // just after midnight

function task(id: number, start: string, end: string | null, duration: number | null): Task {
  return { id, name: `Task ${id}`, date: start.slice(0, 10), start, end, duration_minutes: duration }
}

// Newest first, like /api/logs.
const TASKS = [
  task(5, '2026-10-01 00:10:00', null, null), // running, started today
  task(4, '2026-09-30 23:30:00', '2026-10-01 00:20:00', 50), // crosses midnight
  task(3, '2026-09-30 09:00:00', '2026-09-30 10:00:00', 60),
  task(2, '2026-09-25 09:00:00', '2026-09-25 09:30:00', 30), // 6 days ago
  task(1, '2026-09-01 09:00:00', '2026-09-01 09:15:00', 15), // 30 days ago: just outside "30 days"
]

describe('groupByDay', () => {
  it('puts a session that crosses midnight on the day it started, with its full duration', () => {
    const groups = groupByDay(TASKS, NOW)
    expect(groups.map((group) => group.dateKey)).toEqual(['2026-10-01', '2026-09-30', '2026-09-25', '2026-09-01'])
    expect(groups[1].tasks.map((t) => t.id)).toEqual([4, 3])
    expect(groups[1].totalMinutes).toBe(110)
  })

  it('counts the running task live in its day total', () => {
    expect(groupByDay(TASKS, NOW)[0].totalMinutes).toBe(20)
  })

  it("agrees with Home's focus time for today", () => {
    const todayTotal = groupByDay(filterByRange(TASKS, 'today', NOW), NOW)[0].totalMinutes
    expect(todayTotal).toBe(computeTodayStats(TASKS, [], NOW).focusMinutes)
  })
})

describe('filterByRange', () => {
  const ids = (range: Parameters<typeof filterByRange>[1]) => filterByRange(TASKS, range, NOW).map((t) => t.id)

  it('includes today plus the previous 6 / 29 days, and nothing older', () => {
    expect(ids('today')).toEqual([5])
    expect(ids('7d')).toEqual([5, 4, 3, 2])
    expect(ids('30d')).toEqual([5, 4, 3, 2])
    expect(ids('all')).toEqual([5, 4, 3, 2, 1])
  })
})

describe('shiftDateKey', () => {
  it('rolls over months and years', () => {
    expect(shiftDateKey('2026-10-01', -1)).toBe('2026-09-30')
    expect(shiftDateKey('2027-01-01', -1)).toBe('2026-12-31')
    expect(shiftDateKey('2028-02-28', 1)).toBe('2028-02-29')
  })
})
