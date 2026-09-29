import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/utils/cn'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description?: string
  // An optional button (e.g. "Retry" or "Start a task").
  action?: ReactNode
  // 'error' tints the icon and announces the message to screen readers.
  tone?: 'neutral' | 'error'
  className?: string
}

// "Nothing here yet" / "Couldn't load" message with an optional action.
export function EmptyState({ icon: Icon, title, description, action, tone = 'neutral', className }: EmptyStateProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={cn('flex flex-col items-center px-4 py-8 text-center', className)}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-10 place-items-center rounded-control bg-surface-muted',
          tone === 'error' ? 'text-danger-text' : 'text-secondary',
        )}
      >
        <Icon className="size-5" />
      </span>
      <p className="mt-3 font-medium">{title}</p>
      {description && <p className="mt-1 max-w-xs text-secondary">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
