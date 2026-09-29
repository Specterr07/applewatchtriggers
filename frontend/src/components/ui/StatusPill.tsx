import { cn } from '@/utils/cn'

type StatusTone = 'running' | 'success' | 'error' | 'neutral'

const TONE_STYLES: Record<StatusTone, { pill: string; dot: string }> = {
  running: { pill: 'bg-success/10 text-success-strong', dot: 'bg-success' },
  success: { pill: 'bg-success/10 text-success-strong', dot: 'bg-success' },
  // Outlined rather than tinted: --danger-text on a red tint drops below
  // WCAG AA in light mode (4.2:1); on the plain surface it's 4.8:1.
  error: { pill: 'bg-surface text-danger-text ring-1 ring-danger/40 ring-inset', dot: 'bg-danger' },
  neutral: { pill: 'bg-surface-muted text-secondary-on-bg', dot: 'bg-secondary' },
}

// A small rounded status label. `running` shows a green dot with a soft
// pulse (still, if the user prefers reduced motion); `success` is the same
// green without the pulse, `error` is red, `neutral` is grey.
export function StatusPill({ tone, label }: { tone: StatusTone; label: string }) {
  const styles = TONE_STYLES[tone]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
        styles.pill,
      )}
    >
      <span aria-hidden className="relative flex size-2">
        {tone === 'running' && <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-60" />}
        <span className={cn('relative size-2 rounded-full', styles.dot)} />
      </span>
      {label}
    </span>
  )
}
