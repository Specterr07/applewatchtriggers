import { LoaderCircle } from 'lucide-react'

import { cn } from '@/utils/cn'

// A small spinning loading indicator. Pass `label` when nothing else on
// screen says what's loading, so screen readers announce it.
export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center gap-2">
      <LoaderCircle aria-hidden className={cn('size-4 animate-spin text-secondary', className)} />
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}
