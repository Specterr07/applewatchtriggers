import { Card } from '@/components/ui/Card'
import type { TodayStats as TodayStatsData } from '@/features/home/homeStats'
import { formatDuration } from '@/utils/time'

// Today's three numbers. A row of tiles on phones; a column beside the
// main content on desktop.
export function TodayStats({ stats }: { stats: TodayStatsData }) {
  return (
    <section aria-labelledby="today-heading">
      <h2 id="today-heading" className="mb-3 text-md font-semibold">
        Today
      </h2>
      <dl className="grid grid-cols-3 gap-3 lg:grid-cols-1">
        <StatTile label="Focus" value={stats.focusMinutes > 0 ? formatDuration(stats.focusMinutes) : '0m'} />
        <StatTile label="Tasks" value={String(stats.tasksStarted)} />
        <StatTile label="Notes" value={stats.notesCreated === null ? '–' : String(stats.notesCreated)} />
      </dl>
    </section>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-4 py-3 lg:px-5 lg:py-4">
      <dt className="text-sm text-secondary">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tracking-tight tabular-nums">{value}</dd>
    </Card>
  )
}
