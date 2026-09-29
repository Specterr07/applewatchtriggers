import { cn } from '@/utils/cn'

// A small rounded status label. `running` shows a green dot with a soft
// pulse (still, if the user prefers reduced motion); `neutral` is grey.
export function StatusPill({ tone, label }: { tone: 'running' | 'neutral'; label: string }) {
  const isRunning = tone === 'running'
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
        isRunning ? 'bg-success/10 text-success-strong' : 'bg-surface-muted text-secondary-on-bg',
      )}
    >
      <span aria-hidden className="relative flex size-2">
        {isRunning && <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-60" />}
        <span className={cn('relative size-2 rounded-full', isRunning ? 'bg-success' : 'bg-secondary')} />
      </span>
      {label}
    </span>
  )
}
