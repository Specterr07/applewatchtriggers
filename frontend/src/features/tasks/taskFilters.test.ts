import { describe, expect, it } from 'vitest'

import { filterTasks } from '@/features/tasks/taskFilters'
import type { Task } from '@/types/task'
import { minutesWorked } from '@/utils/tasks'
import { parseServerTimestamp } from '@/utils/time'

function task(id: number, name: string, end: string | null): Task {
  return { id, name, date: '2026-09-30', start: '2026-09-30 09:00:00', end, duration_minutes: end ? 30 : null }
}

const TASKS = [task(3, 'Write docs', null), task(2, 'Review PR', '2026-09-30 09:30:00'), task(12, 'Write tests', '2026-09-30 09:30:00')]

describe('filterTasks', () => {
  it('orders by start time, newest first, not by id', () => {
    const edited = { ...task(40, 'Moved back in time', '2026-09-30 09:30:00'), start: '2026-09-01 09:00:00' }
    expect(filterTasks([edited, ...TASKS], '', 'all').map((t) => t.id)).toEqual([12, 3, 2, 40])
  })

  it('filters by status', () => {
    expect(filterTasks(TASKS, '', 'active').map((t) => t.id)).toEqual([3])
    expect(filterTasks(TASKS, '', 'completed').map((t) => t.id)).toEqual([12, 2])
  })

  it('searches names case-insensitively, and ids with or without #', () => {
    expect(filterTasks(TASKS, 'WRITE', 'all').map((t) => t.id)).toEqual([12, 3])
    expect(filterTasks(TASKS, '#12', 'all').map((t) => t.id)).toEqual([12])
    expect(filterTasks(TASKS, '12', 'all').map((t) => t.id)).toEqual([12])
  })

  it('combines search and status', () => {
    expect(filterTasks(TASKS, 'write', 'completed').map((t) => t.id)).toEqual([12])
  })
})

describe('minutesWorked', () => {
  it('uses the stored duration, or live time while running', () => {
    const now = parseServerTimestamp('2026-09-30 09:45:00')
    expect(minutesWorked(TASKS[1], now)).toBe(30)
    expect(minutesWorked(TASKS[0], now)).toBe(45)
  })
})
