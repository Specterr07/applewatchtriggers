import { CalendarX, CloudOff, Play } from 'lucide-react'
import { useState } from 'react'

import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl'
import { Skeleton } from '@/components/ui/Skeleton'
import { MEDIA_DESKTOP } from '@/config'
import { useCapture } from '@/features/capture/CaptureProvider'
import { filterByRange, groupByDay, type TimeRange } from '@/features/timelog/timeLog'
import { TimeLogDayList } from '@/features/timelog/TimeLogDayList'
import { TimeLogTable } from '@/features/timelog/TimeLogTable'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useNow } from '@/hooks/useNow'
import { useTasks } from '@/hooks/useTasks'
import { totalMinutes } from '@/utils/tasks'
import { formatDuration } from '@/utils/time'

const RANGE_OPTIONS: SegmentOption<TimeRange>[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All' },
]

const EMPTY_MESSAGES: Record<TimeRange, string> = {
  today: 'Nothing logged today yet.',
  '7d': 'Nothing logged in the last 7 days.',
  '30d': 'Nothing logged in the last 30 days.',
  all: 'Nothing logged yet.',
}

// Time Log = WHEN you worked (spec §4.2): the same tasks as the Tasks screen,
// grouped by the day they started, with a total per day.
export function TimeLogPage() {
  // Like Home, refresh every minute while visible so Watch taps show up.
  const tasksQuery = useTasks({ refetchIntervalMs: 60_000 })
  const [range, setRange] = useState<TimeRange>('7d')
  const isDesktop = useMediaQuery(MEDIA_DESKTOP)
  const now = useNow(30_000)
  const { openStartTask } = useCapture()

  const inRange = filterByRange(tasksQuery.data ?? [], range, now)
  const groups = groupByDay(inRange, now)

  return (
    <Page title="Time Log" description="Your tracked time, day by day.">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="md:w-[26rem]">
          <SegmentedControl name="time-range" label="Range" options={RANGE_OPTIONS} value={range} onChange={setRange} />
        </div>
        {inRange.length > 0 && (
          <p className="text-secondary-on-bg">
            <span className="font-semibold text-foreground tabular-nums">{formatDuration(totalMinutes(inRange, now))}</span>
            {' '}across {inRange.length} {inRange.length === 1 ? 'session' : 'sessions'}
          </p>
        )}
      </div>

      {tasksQuery.isPending ? (
        <div role="status" aria-label="Loading" className="flex flex-col gap-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-48 rounded-card" />
        </div>
      ) : tasksQuery.isError && !tasksQuery.data ? (
        <Card>
          <EmptyState tone="error" icon={CloudOff} title="Couldn't load your time log" description={tasksQuery.error.message}
            action={<Button variant="secondary" onClick={() => void tasksQuery.refetch()}>Retry</Button>} />
        </Card>
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState icon={CalendarX} title={EMPTY_MESSAGES[range]} description="Tasks you start here or on your Apple Watch appear on the day they started."
            action={<Button onClick={openStartTask}><Play aria-hidden />Start a task</Button>} />
        </Card>
      ) : isDesktop ? (
        <TimeLogTable groups={groups} now={now} />
      ) : (
        <TimeLogDayList groups={groups} now={now} />
      )}
    </Page>
  )
}
