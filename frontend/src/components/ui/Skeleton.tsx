import { cn } from '@/utils/cn'

// A grey placeholder block shown while content loads. Size it with className.
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-control bg-surface-muted', className)} />
}
