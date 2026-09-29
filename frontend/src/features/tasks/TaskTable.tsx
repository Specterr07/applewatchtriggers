import { Link, useNavigate } from 'react-router'

import { Card } from '@/components/ui/Card'
import { TaskStatus } from '@/features/tasks/TaskStatus'
import type { Task } from '@/types/task'
import { formatTaskDuration } from '@/utils/tasks'
import { formatClockTime, formatShortDate, type WallClock } from '@/utils/time'

const HEADER_CELL = 'px-4 py-2.5 text-xs font-semibold tracking-wide text-secondary uppercase'

// Desktop task table (spec §5.3: ID · Name · Date · Start · End · Duration ·
// Status). The whole row is clickable; the name is also a real link so
// keyboard and screen-reader users can open a task.
export function TaskTable({ tasks, now }: { tasks: Task[]; now: WallClock }) {
  const navigate = useNavigate()

  return (
    <Card className="overflow-hidden">
      <table className="w-full table-fixed text-left">
        <thead className="border-b border-border bg-surface-muted">
          <tr>
            <th scope="col" className={`${HEADER_CELL} w-20`}>ID</th>
            <th scope="col" className={HEADER_CELL}>Name</th>
            <th scope="col" className={`${HEADER_CELL} w-24`}>Date</th>
            <th scope="col" className={`${HEADER_CELL} w-28`}>Start</th>
            <th scope="col" className={`${HEADER_CELL} w-28`}>End</th>
            <th scope="col" className={`${HEADER_CELL} w-28 text-right`}>Duration</th>
            <th scope="col" className={`${HEADER_CELL} w-36`}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tasks.map((task) => (
            <tr
              key={task.id}
              onClick={() => navigate(`/tasks/${task.id}`)}
              className="h-12 cursor-pointer transition-colors hover:bg-surface-muted"
            >
              <td className="px-4 text-secondary tabular-nums">#{task.id}</td>
              <td className="px-4">
                <Link to={`/tasks/${task.id}`} className="block truncate font-medium" onClick={(event) => event.stopPropagation()}>
                  {task.name}
                </Link>
              </td>
              <td className="px-4 text-secondary">{formatShortDate(task.date)}</td>
              <td className="px-4 tabular-nums">{formatClockTime(task.start)}</td>
              <td className="px-4 tabular-nums">{task.end ? formatClockTime(task.end) : <span className="text-secondary">—</span>}</td>
              <td className="px-4 text-right font-medium tabular-nums">{formatTaskDuration(task, now)}</td>
              <td className="px-4">
                <TaskStatus task={task} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
