import { Compass } from 'lucide-react'
import { Link } from 'react-router'

import { Page } from '@/components/layout/Page'
import { buttonVariants } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

// Shown for any /app/... URL that doesn't match a screen.
export function NotFoundPage() {
  return (
    <Page title="Page not found">
      <Card className="flex flex-col items-start gap-4 p-5">
        <Compass aria-hidden className="size-6 text-secondary" />
        <p className="text-secondary">This link doesn't match any screen in Sheev.</p>
        <Link to="/" className={buttonVariants({ variant: 'secondary' })}>
          Go to Overview
        </Link>
      </Card>
    </Page>
  )
}
