// The numbers and activity feed on Home (spec §5.3), as plain functions so
// they can be tested without rendering anything.
//
// "Today" means today in the server's timezone, and a task counts on the
// day it *started* - the same rule as the backend's `date` field.

import { getNoteTitle } from '@/features/notes/noteText'
import type { Note } from '@/types/note'
import type { Task } from '@/types/task'
import { totalMinutes } from '@/utils/tasks'
import { formatDuration, toDateKey, type WallClock } from '@/utils/time'

export type TodayStats = {
  focusMinutes: number
  tasksStarted: number
  notesCreated: number | null // null while notes are unavailable
}

export function computeTodayStats(tasks: Task[], notes: Note[] | undefined, now: WallClock): TodayStats {
  const today = toDateKey(now)
  const startedToday = tasks.filter((task) => task.date === today)

  return {
    // Same calculation Time Log uses for its "Today" total (utils/tasks.ts),
    // including a running task's live time.
    focusMinutes: totalMinutes(startedToday, now),
    tasksStarted: startedToday.length,
    notesCreated: notes ? notes.filter((note) => note.created_at.startsWith(today)).length : null,
  }
}

export type ActivityEvent = {
  key: string
  kind: 'started' | 'stopped' | 'note'
  at: string // server timestamp
  title: string
  detail: string
}

// The most recent task starts/stops and saved notes, newest first.
export function buildRecentActivity(tasks: Task[], notes: Note[] | undefined, limit = 8): ActivityEvent[] {
  const events: ActivityEvent[] = []

  for (const task of tasks) {
    events.push({ key: `task-${task.id}-start`, kind: 'started', at: task.start, title: task.name, detail: 'Started' })
    if (task.end) {
      const duration = task.duration_minutes != null ? ` · ${formatDuration(task.duration_minutes)}` : ''
      events.push({ key: `task-${task.id}-end`, kind: 'stopped', at: task.end, title: task.name, detail: `Stopped${duration}` })
    }
  }
  for (const note of notes ?? []) {
    events.push({ key: `note-${note.id}`, kind: 'note', at: note.created_at, title: getNoteTitle(note.transcript), detail: 'Voice note' })
  }

  // The fixed "YYYY-MM-DD HH:MM:SS" format sorts correctly as plain text.
  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)
}
