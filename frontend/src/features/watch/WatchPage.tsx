import { CloudOff, RotateCw } from 'lucide-react'

import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { buildRecentActivity } from '@/features/home/homeStats'
import { RecentActivity } from '@/features/home/RecentActivity'
import { ApiStatusCard } from '@/features/watch/ApiStatusCard'
import { ShortcutSetup } from '@/features/watch/ShortcutSetup'
import { HowItWorks, Troubleshooting } from '@/features/watch/WatchGuide'
import { useNow } from '@/hooks/useNow'
import { useTasks } from '@/hooks/useTasks'

// Spec §4.9: the last 10 start/stop events.
const ACTIVITY_LIMIT = 10

// Apple Watch (spec §4.9): what the API can tell us, how the Shortcut
// works and how to set it up. Stacked on phones, two columns on desktop.
export function WatchPage() {
  return (
    <Page title="Apple Watch" description="Start and stop tasks with one tap, using an Apple Shortcut.">
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <ApiStatusCard />
          <ShortcutSetup />
          <HowItWorks />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <WatchActivity />
          <Troubleshooting />
        </div>
      </div>
    </Page>
  )
}

// Recent starts/stops from the shared task list. The backend doesn't record
// where a press came from, so the list says so instead of guessing.
function WatchActivity() {
  const tasksQuery = useTasks()
  const now = useNow(30_000)
  const title = 'Recent start/stop activity'
  const description = 'Includes the Watch and the web app. Sheev doesn’t record which device was used.'

  if (tasksQuery.isPending) {
    return (
      <section aria-label={title} role="status">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-3 h-72 rounded-card" />
      </section>
    )
  }

  if (tasksQuery.isError && !tasksQuery.data) {
    return (
      <section aria-label={title}>
        <h2 className="text-md font-semibold">{title}</h2>
        <Card className="mt-3">
          <EmptyState
            tone="error"
            icon={CloudOff}
            title="Couldn't load activity"
            description={tasksQuery.error.message}
            action={
              <Button variant="secondary" onClick={() => void tasksQuery.refetch()}>
                <RotateCw aria-hidden />
                Retry
              </Button>
            }
          />
        </Card>
      </section>
    )
  }

  return (
    <RecentActivity
      events={buildRecentActivity(tasksQuery.data, undefined, ACTIVITY_LIMIT)}
      now={now}
      title={title}
      description={description}
      emptyDescription="Starts and stops from the Watch or this app will show up here."
    />
  )
}
