import { CircleAlert, Pause, Play, RotateCw } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useNoteAudio } from '@/features/notes/useNoteAudio'
import type { Note } from '@/types/note'

// Full player for note detail: the browser's own controls (seek, volume,
// speed) plus a clear message and Retry if the recording can't be played.
export function NotePlayer({ note }: { note: Note }) {
  const { audioProps, status, errorMessage, retry } = useNoteAudio(note)

  return (
    <div className="flex flex-col gap-2">
      {/* preload="metadata" shows the length, and surfaces an expired link
          (and its automatic refresh) before the user even presses play. */}
      <audio controls preload="metadata" className="h-11 w-full" {...audioProps} />
      {status === 'recovering' && (
        <p role="status" className="flex items-center gap-2 text-sm text-secondary"><Spinner /> Refreshing the playback link…</p>
      )}
      {status === 'failed' && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-danger-text">
          <CircleAlert aria-hidden className="size-4" />
          <span className="flex-1">{errorMessage}</span>
          <Button variant="secondary" onClick={retry}><RotateCw aria-hidden />Try again</Button>
        </div>
      )}
    </div>
  )
}

// Compact play/pause for the notes list (no preloading, so a long list
// doesn't download every recording).
export function NotePlayButton({ note }: { note: Note }) {
  const { audioProps, status, errorMessage, isPlaying, togglePlay, retry } = useNoteAudio(note)

  const label = status === 'failed' ? `Can’t play: ${errorMessage} Tap to try again.` : isPlaying ? 'Pause' : 'Play'
  const icon =
    status === 'recovering' ? <Spinner /> :
    status === 'failed' ? <CircleAlert aria-hidden className="text-danger-text" /> :
    isPlaying ? <Pause aria-hidden /> : <Play aria-hidden />

  return (
    <>
      <audio preload="none" {...audioProps} />
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        title={status === 'failed' ? errorMessage ?? undefined : undefined}
        onClick={status === 'failed' ? retry : togglePlay}
        disabled={status === 'recovering'}
        className={isPlaying ? 'text-accent-text' : undefined}
      >
        {icon}
      </Button>
    </>
  )
}
