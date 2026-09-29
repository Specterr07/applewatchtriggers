import { ArrowUpRight, Hammer } from 'lucide-react'

import { Page } from '@/components/layout/Page'
import { buttonVariants } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

// Stand-in for screens that later phases build (spec §10). Points to the
// old app, which keeps working at "/" until the new one reaches parity.
export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <Page title={title} description={description}>
      <Card className="flex flex-col items-start gap-4 p-5 md:flex-row md:items-center">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-muted text-secondary">
          <Hammer className="size-5" />
        </span>
        <div className="flex-1">
          <p className="font-medium">This screen is being rebuilt</p>
          <p className="text-secondary">Until it's ready, the current app has everything you need.</p>
        </div>
        {/* A plain <a>, not a router link: "/" is outside this app's /app base. */}
        <a href="/" className={buttonVariants({ variant: 'secondary' })}>
          Open current app
          <ArrowUpRight aria-hidden />
        </a>
      </Card>
    </Page>
  )
}
