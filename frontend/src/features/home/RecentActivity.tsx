import { History, Mic, Play, Square, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import type { ActivityEvent } from '@/features/home/homeStats'
import { cn } from '@/utils/cn'
import { formatEventTime, type WallClock } from '@/utils/time'

const EVENT_ICONS: Record<ActivityEvent['kind'], { icon: LucideIcon; className: string }> = {
  started: { icon: Play, className: 'text-success-strong' },
  stopped: { icon: Square, className: 'text-secondary' },
  note: { icon: Mic, className: 'text-accent-text' },
}

type RecentActivityProps = {
  events: ActivityEvent[]
  now: WallClock
  // Shown under the list, e.g. "notes couldn't be loaded".
  footer?: ReactNode
}

// A short, newest-first feed of task starts/stops and saved notes.
export function RecentActivity({ events, now, footer }: RecentActivityProps) {
  return (
    <section aria-labelledby="activity-heading">
      <h2 id="activity-heading" className="mb-3 text-md font-semibold">
        Recent activity
      </h2>
      <Card>
        {events.length === 0 ? (
          <EmptyState
            icon={History}
            title="Nothing here yet"
            description="Start a task or record a note and it will show up here."
          />
        ) : (
          <ol className="divide-y divide-border">
            {events.map((event) => (
              <ActivityRow key={event.key} event={event} now={now} />
            ))}
          </ol>
        )}
        {footer}
      </Card>
    </section>
  )
}

function ActivityRow({ event, now }: { event: ActivityEvent; now: WallClock }) {
  const { icon: Icon, className } = EVENT_ICONS[event.kind]
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-control bg-surface-muted">
        <Icon className={cn('size-4', className)} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{event.title}</p>
        <p className="text-sm text-secondary">{event.detail}</p>
      </div>
      <time className="shrink-0 text-sm text-secondary tabular-nums">{formatEventTime(event.at, now)}</time>
    </li>
  )
}
