import { Link, useNavigate } from 'react-router'

import { Card } from '@/components/ui/Card'
import { TaskStatus } from '@/features/tasks/TaskStatus'
import type { DayGroup } from '@/features/timelog/timeLog'
import { formatTaskDuration } from '@/utils/tasks'
import { formatClockTime, formatDayHeading, formatDuration, formatShortDate, isRelativeDay, type WallClock } from '@/utils/time'

const HEADER_CELL = 'px-4 py-2.5 text-xs font-semibold tracking-wide text-secondary uppercase'

// Desktop Time Log: one dense table, a header row per day with its total,
// then that day's sessions (Start · End · Task · ID · Duration · Status).
export function TimeLogTable({ groups, now }: { groups: DayGroup[]; now: WallClock }) {
  const navigate = useNavigate()

  return (
    <Card className="overflow-hidden">
      <table className="w-full table-fixed text-left">
        <thead className="border-b border-border">
          <tr>
            <th scope="col" className={`${HEADER_CELL} w-28`}>Start</th>
            <th scope="col" className={`${HEADER_CELL} w-28`}>End</th>
            <th scope="col" className={HEADER_CELL}>Task</th>
            <th scope="col" className={`${HEADER_CELL} w-20`}>ID</th>
            <th scope="col" className={`${HEADER_CELL} w-28 text-right`}>Duration</th>
            <th scope="col" className={`${HEADER_CELL} w-36`}>Status</th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.dateKey} className="border-b border-border last:border-b-0">
            <tr className="bg-surface-muted">
              <th scope="colgroup" colSpan={4} className="px-4 py-2 font-semibold">
                {formatDayHeading(group.dateKey, now)}
                {isRelativeDay(group.dateKey, now) && (
                  <span className="ml-2 text-sm font-normal text-secondary-on-bg">{formatShortDate(group.dateKey)}</span>
                )}
              </th>
              <td className="px-4 py-2 text-right font-semibold tabular-nums">{formatDuration(group.totalMinutes)}</td>
              <td />
            </tr>
            {group.tasks.map((task) => (
              <tr
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="h-12 cursor-pointer border-t border-border transition-colors hover:bg-surface-muted"
              >
                <td className="px-4 tabular-nums">{formatClockTime(task.start)}</td>
                <td className="px-4 tabular-nums">{task.end ? formatClockTime(task.end) : <span className="text-secondary">—</span>}</td>
                <td className="px-4">
                  <Link to={`/tasks/${task.id}`} className="block truncate font-medium" onClick={(event) => event.stopPropagation()}>
                    {task.name}
                  </Link>
                </td>
                <td className="px-4 text-secondary tabular-nums">#{task.id}</td>
                <td className="px-4 text-right tabular-nums">{formatTaskDuration(task, now)}</td>
                <td className="px-4">
                  <TaskStatus task={task} />
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </Card>
  )
}
