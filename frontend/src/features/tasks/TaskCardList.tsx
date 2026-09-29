import { Link } from 'react-router'

import { TaskStatus } from '@/features/tasks/TaskStatus'
import type { Task } from '@/types/task'
import { formatTaskDuration, formatTaskTimeRange } from '@/utils/tasks'
import { formatShortDate, type WallClock } from '@/utils/time'

// Tasks as tappable cards - phones get one column, tablets two. Each card
// opens the task's detail.
export function TaskCardList({ tasks, now }: { tasks: Task[]; now: WallClock }) {
  return (
    <ul className="grid gap-2 md:grid-cols-2 md:gap-3">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link
            to={`/tasks/${task.id}`}
            className="flex min-h-11 items-center gap-4 rounded-card border border-border bg-surface px-4 py-3 shadow-card transition-colors hover:bg-surface-muted"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{task.name}</p>
                {task.end === null && <TaskStatus task={task} />}
              </div>
              <p className="mt-0.5 truncate text-sm text-secondary">
                <span className="tabular-nums">#{task.id}</span> · {formatShortDate(task.date)} · {formatTaskTimeRange(task)}
              </p>
            </div>
            <p className="shrink-0 text-md font-semibold tabular-nums">{formatTaskDuration(task, now)}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
