import { Play, Square } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { StatusPill } from '@/components/ui/StatusPill'
import type { Task } from '@/types/task'
import { cn } from '@/utils/cn'
import { formatTimer, secondsSince, type WallClock } from '@/utils/time'

type RunningTaskStripProps = {
  activeTask: Task | null
  now: WallClock
  isPending: boolean
  onStart: () => void
  onStop: () => void
}

// Tasks are secondary on Home now, so this is one slim row instead of a
// hero card: the running task + timer + Stop, or a quiet "Start a task".
export function RunningTaskStrip({ activeTask, now, isPending, onStart, onStop }: RunningTaskStripProps) {
  if (!activeTask) {
    return (
      <Card className="flex items-center justify-between gap-3 px-4 py-2">
        <p className="text-secondary">
          No task running ·{' '}
          <Link to="/tasks" className="font-medium text-accent-text">
            Tasks
          </Link>
        </p>
        <Button variant="ghost" onClick={onStart} disabled={isPending}>
          {isPending ? <Spinner /> : <Play aria-hidden />}
          Start a task
        </Button>
      </Card>
    )
  }

  return (
    <Card className={cn('flex items-center gap-3 px-4 py-2', 'border-success/50')}>
      <StatusPill tone="running" label="Running" />
      <Link to={`/tasks/${activeTask.id}`} className="min-w-0 flex-1 truncate font-medium">
        {activeTask.name}
      </Link>
      <span role="timer" aria-live="off" className="font-semibold tabular-nums">
        {formatTimer(secondsSince(activeTask.start, now))}
      </span>
      <Button variant="secondary" onClick={onStop} disabled={isPending} aria-label="Stop task">
        {isPending ? <Spinner /> : <Square aria-hidden />}
        <span className="hidden sm:inline">Stop</span>
      </Button>
    </Card>
  )
}
