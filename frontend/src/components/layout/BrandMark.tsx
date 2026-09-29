import { Timer } from 'lucide-react'

import { cn } from '@/utils/cn'

// The Sheev logo mark: an accent tile with the timer icon (a nod to the
// app's origin as a one-tap time logger). Optionally with the wordmark.
export function BrandMark({ size = 'md', showName = false }: { size?: 'md' | 'lg'; showName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden
        className={cn(
          'grid place-items-center bg-accent-strong text-on-accent',
          size === 'lg' ? 'size-12 rounded-card' : 'size-8 rounded-control',
        )}
      >
        <Timer className={size === 'lg' ? 'size-6' : 'size-4'} strokeWidth={2.25} />
      </span>
      {showName && <span className="text-md font-semibold tracking-tight">Sheev</span>}
    </span>
  )
}
