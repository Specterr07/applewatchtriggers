import { describe, expect, it } from 'vitest'

import { buildRecentActivity } from '@/features/home/homeStats'
import { buildShortcutUrl, MASKED_KEY, nextPressLabel } from '@/features/watch/shortcut'
import type { Task } from '@/types/task'

const ORIGIN = 'https://applewatchtriggers.fly.dev'

describe('buildShortcutUrl', () => {
  it('hides the key until revealed', () => {
    expect(buildShortcutUrl(ORIGIN, 'secret', { reveal: false })).toBe(`${ORIGIN}/toggle?key=${MASKED_KEY}`)
  })

  it('shows the real key when revealed, URL-encoded', () => {
    expect(buildShortcutUrl(ORIGIN, 'a b&c', { reveal: true })).toBe(`${ORIGIN}/toggle?key=a%20b%26c`)
  })

  it('never puts the /app prefix in front of /toggle', () => {
    expect(buildShortcutUrl('http://localhost:8080', 'k', { reveal: true })).toBe('http://localhost:8080/toggle?key=k')
  })
})

describe('nextPressLabel', () => {
  it('maps the API action to the words on screen', () => {
    expect(nextPressLabel('Start')).toBe('Start')
    expect(nextPressLabel('End')).toBe('Stop')
  })
})

describe('Watch screen activity (start/stop events only)', () => {
  const task = (id: number, start: string, end: string | null): Task => ({
    id,
    name: `Task ${id}`,
    date: start.slice(0, 10),
    start,
    end,
    duration_minutes: end ? 30 : null,
  })

  it('lists the latest 10 starts and stops, newest first', () => {
    const tasks = Array.from({ length: 8 }, (_, i) =>
      task(8 - i, `2026-09-${String(20 + 8 - i).padStart(2, '0')} 09:00:00`, `2026-09-${String(20 + 8 - i).padStart(2, '0')} 09:30:00`),
    )
    const events = buildRecentActivity(tasks, undefined, 10)
    expect(events).toHaveLength(10)
    expect(events[0]).toMatchObject({ kind: 'stopped', at: '2026-09-28 09:30:00' })
    expect(events[1]).toMatchObject({ kind: 'started', at: '2026-09-28 09:00:00' })
    expect(events.every((event) => event.kind !== 'note')).toBe(true)
  })
})
