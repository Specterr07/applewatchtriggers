import { describe, expect, it } from 'vitest'

import { buildRecentActivity, computeTodayStats } from '@/features/home/homeStats'
import type { Note } from '@/types/note'
import type { Task } from '@/types/task'
import { parseServerTimestamp } from '@/utils/time'

const NOW = parseServerTimestamp('2026-09-30 11:00:00')

function task(id: number, start: string, end: string | null, duration: number | null, name = `Task ${id}`): Task {
  return { id, name, date: start.slice(0, 10), start, end, duration_minutes: duration }
}

function note(id: number, createdAt: string, transcript = 'Buy milk'): Note {
  return { id, transcript, audio_url: null, created_at: createdAt }
}

describe('computeTodayStats', () => {
  it('adds completed minutes and the running task\'s live time, counting only today', () => {
    const active = task(3, '2026-09-30 10:30:00', null, null)
    const tasks = [active, task(2, '2026-09-30 08:00:00', '2026-09-30 08:45:00', 45), task(1, '2026-09-29 20:00:00', '2026-09-29 21:00:00', 60)]
    const notes = [note(2, '2026-09-30 09:00:00'), note(1, '2026-09-29 09:00:00')]

    expect(computeTodayStats(tasks, notes, NOW)).toEqual({
      focusMinutes: 45 + 30,
      tasksStarted: 2,
      notesCreated: 1,
    })
  })

  it('does not count a task that started yesterday, even if still running', () => {
    const active = task(1, '2026-09-29 23:00:00', null, null)
    expect(computeTodayStats([active], [], NOW).focusMinutes).toBe(0)
  })

  it('reports notes as unknown when they could not be loaded', () => {
    expect(computeTodayStats([], undefined, NOW).notesCreated).toBeNull()
  })
})

describe('buildRecentActivity', () => {
  it('merges starts, stops and notes newest first, up to the limit', () => {
    const tasks = [task(2, '2026-09-30 10:00:00', null, null, 'Write docs'), task(1, '2026-09-30 08:00:00', '2026-09-30 09:05:00', 65, 'Gym')]
    const notes = [note(1, '2026-09-30 09:30:00', 'Call the bank\nabout the card')]

    const events = buildRecentActivity(tasks, notes)
    expect(events.map((event) => [event.kind, event.title, event.detail])).toEqual([
      ['started', 'Write docs', 'Started'],
      ['note', 'Call the bank', 'Voice note'],
      ['stopped', 'Gym', 'Stopped · 1h 05m'],
      ['started', 'Gym', 'Started'],
    ])
    expect(buildRecentActivity(tasks, notes, 2)).toHaveLength(2)
  })
})
