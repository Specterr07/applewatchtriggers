import { describe, expect, it } from 'vitest'

import { getRecentTaskNames } from '@/features/capture/recentTaskNames'
import type { Task } from '@/types/task'

function task(id: number, name: string): Task {
  return { id, name, date: '2026-09-30', start: '2026-09-30 09:00:00', end: null, duration_minutes: null }
}

describe('getRecentTaskNames', () => {
  it('keeps the most recent distinct user-chosen names, skipping generic titles', () => {
    const tasks = [
      task(6, 'Write docs'),
      task(5, 'Task – Fri, 9:00 AM'),
      task(4, 'Write docs'),
      task(3, 'Review PR'),
      task(2, 'Task – Mon, 12:30 PM'),
      task(1, 'Gym'),
    ]
    expect(getRecentTaskNames(tasks)).toEqual(['Write docs', 'Review PR', 'Gym'])
  })

  it('stops at the limit', () => {
    const tasks = ['a', 'b', 'c', 'd'].map((name, index) => task(index, name))
    expect(getRecentTaskNames(tasks, 2)).toEqual(['a', 'b'])
  })
})
