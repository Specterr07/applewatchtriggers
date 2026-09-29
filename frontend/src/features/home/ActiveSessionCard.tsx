import { Play, Square } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { StatusPill } from '@/components/ui/StatusPill'
import type { Task } from '@/types/task'
import { cn } from '@/utils/cn'
import { formatClockTime, formatTimer, secondsSince, type WallClock } from '@/utils/time'

type ActiveSessionCardProps = {
  activeTask: Task | null
  now: WallClock
  isPending: boolean
  onStart: () => void
  onStop: () => void
}

// The hero of Home: what's running right now and for how long, with the
// one obvious action (Stop, or Start when nothing is running).
export function ActiveSessionCard({ activeTask, now, isPending, onStart, onStop }: ActiveSessionCardProps) {
  const isRunning = activeTask !== null

  return (
    <Card className={cn('p-5 md:p-6', isRunning && 'border-success/50')}>
      <div className="flex items-center justify-between gap-3">
        <StatusPill tone={isRunning ? 'running' : 'neutral'} label={isRunning ? 'Running' : 'Idle'} />
        {activeTask && <span className="text-sm text-secondary tabular-nums">#{activeTask.id}</span>}
      </div>

      <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        {activeTask ? (
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-lg font-semibold tracking-tight break-words">{activeTask.name}</h2>
            <p
              role="timer"
              aria-live="off"
              className="mt-1 text-2xl font-semibold tracking-tight tabular-nums"
            >
              {formatTimer(secondsSince(activeTask.start, now))}
            </p>
            <p className="mt-1 text-secondary">Started {formatClockTime(activeTask.start)}</p>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Nothing running</h2>
            <p className="mt-1 text-secondary">Start a task here, or tap your Apple Watch.</p>
          </div>
        )}

        <Button
          onClick={isRunning ? onStop : onStart}
          disabled={isPending}
          className="w-full md:w-auto md:min-w-36"
        >
          {isPending ? <Spinner className="text-on-accent" /> : isRunning ? <Square aria-hidden /> : <Play aria-hidden />}
          {isRunning ? 'Stop' : 'Start a task'}
        </Button>
      </div>
    </Card>
  )
}
