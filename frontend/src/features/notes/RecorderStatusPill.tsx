import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { Spinner } from '@/components/ui/Spinner'
import { useRecorder } from '@/features/notes/RecorderProvider'
import type { RecorderPhase } from '@/features/notes/recorderController'
import { formatRecordingTime, useElapsedSeconds } from '@/hooks/useElapsedSeconds'
import { cn } from '@/utils/cn'

type RecorderStatusPillProps = {
  onOpen: () => void
  // Phones: sit above the bottom nav when it's showing.
  aboveBottomNav: boolean
}

// While the recorder panel is closed, keeps an active recording (or an
// upload, or a failed save) visible from any screen (spec §4.5). Tapping it
// reopens the recorder.
export function RecorderStatusPill({ onOpen, aboveBottomNav }: RecorderStatusPillProps) {
  const { state } = useRecorder()
  const elapsed = useElapsedSeconds(state.phase === 'recording' ? state.startedAt : null)

  // What the pill says in each phase; idle/success show no pill at all.
  const byPhase: Partial<Record<RecorderPhase, { label: string; icon: ReactNode }>> = {
    requesting: { label: 'Starting microphone…', icon: <Spinner /> },
    recording: {
      label: `Recording ${formatRecordingTime(elapsed)}`,
      icon: <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-danger" />,
    },
    uploading: { label: 'Uploading note…', icon: <Spinner /> },
    processing: { label: 'Transcribing…', icon: <Spinner /> },
    error: { label: 'Note not saved', icon: <TriangleAlert aria-hidden className="size-4 text-danger-text" /> },
  }
  const content = byPhase[state.phase]
  if (!content) return null

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'fixed left-1/2 z-40 flex h-11 -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium shadow-raised',
        'md:top-4 md:right-6 md:bottom-auto md:left-auto md:translate-x-0',
        aboveBottomNav ? 'bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)]' : 'bottom-[calc(env(safe-area-inset-bottom)+1rem)]',
      )}
    >
      {content.icon}
      <span className="tabular-nums">{content.label}</span>
      <span className="sr-only">- open recorder</span>
    </button>
  )
}
