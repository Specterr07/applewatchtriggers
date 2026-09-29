import { Link } from 'react-router'

import { TaskStatus } from '@/features/tasks/TaskStatus'
import type { Task } from '@/types/task'
import { formatTaskDuration, formatTaskTimeRange } from '@/utils/tasks'
import { formatShortDate, type WallClock } from '@/utils/time'

// Tasks as tappable cards - phones get one column, tablets two. Each card
// opens the task's detail. The explicit grid-cols-1 keeps the column at the
// screen's width; without it, a long task name would widen the whole list.
export function TaskCardList({ tasks, now }: { tasks: Task[]; now: WallClock }) {
  return (
    <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link
            to={`/tasks/${task.id}`}
            className="flex min-h-11 items-start gap-3 rounded-card border border-border bg-surface px-4 py-3 shadow-card transition-colors hover:bg-surface-muted sm:gap-4"
          >
            <div className="min-w-0 flex-1">
              {/* Up to two lines; wrap-anywhere lets a URL or other unbroken
                  name break instead of pushing the card wider. */}
              <p className="line-clamp-2 font-medium wrap-anywhere">{task.name}</p>
              {/* Wraps as a sentence on narrow phones instead of cutting off
                  the end time; the time range itself never splits. */}
              <p className="mt-1 text-sm text-secondary">
                {task.end === null && (
                  <span className="mr-2 inline-block align-middle">
                    <TaskStatus task={task} />
                  </span>
                )}
                <span className="tabular-nums">#{task.id}</span> · {formatShortDate(task.date)} ·{' '}
                <span className="whitespace-nowrap">{formatTaskTimeRange(task)}</span>
              </p>
            </div>
            <p className="shrink-0 text-md font-semibold tabular-nums">{formatTaskDuration(task, now)}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
