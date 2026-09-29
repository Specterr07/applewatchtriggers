import { ChevronRight } from 'lucide-react'
import { Link, Navigate } from 'react-router'

import { MOBILE_MORE } from '@/components/layout/navItems'
import { Page } from '@/components/layout/Page'
import { Card } from '@/components/ui/Card'
import { MEDIA_HAS_SIDEBAR } from '@/config'
import { useMediaQuery } from '@/hooks/useMediaQuery'

// Phone-only list of the screens that don't fit in the bottom bar. With a
// sidebar on screen (tablet/desktop) it has no purpose, so it redirects home.
export function MorePage() {
  const hasSidebar = useMediaQuery(MEDIA_HAS_SIDEBAR)
  if (hasSidebar) return <Navigate to="/" replace />

  return (
    <Page title="More">
      <Card>
        <ul className="divide-y divide-border">
          {MOBILE_MORE.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.path}>
                <Link to={item.path} className="flex h-14 items-center gap-3 px-4">
                  <Icon aria-hidden className="size-5 text-secondary" />
                  <span className="flex-1 font-medium">{item.label}</span>
                  <ChevronRight aria-hidden className="size-4 text-secondary" />
                </Link>
              </li>
            )
          })}
        </ul>
      </Card>
    </Page>
  )
}
