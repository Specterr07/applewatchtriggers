import { Link } from 'react-router'

import { Card } from '@/components/ui/Card'
import { StatusPill } from '@/components/ui/StatusPill'
import type { DayGroup } from '@/features/timelog/timeLog'
import { formatTaskDuration } from '@/utils/tasks'
import { formatClockTime, formatDayHeading, formatDuration, formatShortDate, isRelativeDay, type WallClock } from '@/utils/time'

// Phone/tablet Time Log: one card per day, sessions listed by start time,
// the day's total beside its heading.
export function TimeLogDayList({ groups, now }: { groups: DayGroup[]; now: WallClock }) {
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.dateKey} aria-labelledby={`day-${group.dateKey}`}>
          <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
            <h2 id={`day-${group.dateKey}`} className="font-semibold">
              {formatDayHeading(group.dateKey, now)}
              {isRelativeDay(group.dateKey, now) && (
                <span className="ml-2 text-sm font-normal text-secondary-on-bg">{formatShortDate(group.dateKey)}</span>
              )}
            </h2>
            <p className="text-sm font-semibold tabular-nums">{formatDuration(group.totalMinutes)}</p>
          </div>
          <Card>
            <ol className="divide-y divide-border">
              {group.tasks.map((task) => (
                <li key={task.id}>
                  <Link to={`/tasks/${task.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-surface-muted">
                    {/* Time column: start over end, like a timeline. */}
                    <div className="w-20 shrink-0 text-sm tabular-nums">
                      <p>{formatClockTime(task.start)}</p>
                      <p className="text-secondary">{task.end ? formatClockTime(task.end) : 'now'}</p>
                    </div>
                    <div className="min-w-0 flex-1 border-l border-border pl-3">
                      <p className="truncate font-medium">{task.name}</p>
                      <p className="text-sm text-secondary tabular-nums">#{task.id}</p>
                    </div>
                    {task.end === null ? (
                      <StatusPill tone="running" label={formatTaskDuration(task, now)} />
                    ) : (
                      <p className="shrink-0 font-medium tabular-nums">{formatTaskDuration(task, now)}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        </section>
      ))}
    </div>
  )
}
