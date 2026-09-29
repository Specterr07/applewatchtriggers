import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/Button'

// Phones: a detail view (a task, a note) takes the whole screen, with a
// sticky header and Back button (spec §6). Wider screens use a Drawer.
export function DetailScreen({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 border-b border-border bg-surface px-2">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack}>
          <ChevronLeft aria-hidden className="size-5!" />
        </Button>
        <h1 className="text-md font-semibold">{title}</h1>
      </header>
      {children}
    </div>
  )
}
