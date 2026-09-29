import { CircleCheck, Mic, MicOff, RotateCw, Square, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useRecorder } from '@/features/notes/RecorderProvider'
import type { RecorderErrorKind } from '@/features/notes/recorderController'
import { formatRecordingTime, useElapsedSeconds } from '@/hooks/useElapsedSeconds'

const ERROR_TITLES: Record<RecorderErrorKind, string> = {
  unsupported: 'Recording isn’t available',
  'permission-denied': 'Microphone blocked',
  'no-microphone': 'No microphone found',
  'microphone-busy': 'Microphone unavailable',
  'empty-recording': 'Nothing was recorded',
  'upload-failed': 'Note not saved',
}

type RecorderPanelProps = {
  onClose: () => void
  onViewNote: (noteId: number) => void
}

// The recording screen inside the Capture sheet/dialog: one clear state at a
// time, with the main action large and at the bottom for one-handed use.
export function RecorderPanel({ onClose, onViewNote }: RecorderPanelProps) {
  const { state, start, stop, cancel, retryUpload, reset } = useRecorder()
  const elapsed = useElapsedSeconds(state.phase === 'recording' ? state.startedAt : null)
  const wide = 'h-12 w-full'

  switch (state.phase) {
    case 'idle':
      return (
        <Layout icon={Mic} title="Record a voice note" detail="It’s transcribed and saved to Notes when you stop.">
          <Button className={wide} onClick={() => void start()}><Mic aria-hidden />Start recording</Button>
        </Layout>
      )
    case 'requesting':
      return (
        <Layout busy title="Waiting for the microphone…" detail="Allow access if your browser asks.">
          <Button variant="secondary" className={wide} onClick={cancel}>Cancel</Button>
        </Layout>
      )
    case 'recording':
      return (
        <div className="flex flex-col items-center gap-5 pt-2">
          <p role="status" className="flex items-center gap-2 font-semibold text-danger-text">
            <span aria-hidden className="relative flex size-3">
              <span className="absolute inset-0 animate-ping rounded-full bg-danger opacity-60" />
              <span className="relative size-3 rounded-full bg-danger" />
            </span>
            Recording
          </p>
          <p role="timer" aria-live="off" className="text-2xl font-semibold tracking-tight tabular-nums">{formatRecordingTime(elapsed)}</p>
          <div className="flex w-full flex-col gap-2">
            <Button className={wide} onClick={stop}><Square aria-hidden />Stop & save</Button>
            <Button variant="secondary" className={wide} onClick={cancel}>Cancel</Button>
          </div>
        </div>
      )
    case 'uploading':
      return <Layout busy title="Uploading…" detail="Keep this page open until it’s saved." />
    case 'processing':
      return <Layout busy title="Transcribing…" detail="Usually a few seconds; long notes can take up to a minute." />
    case 'success':
      return (
        <Layout icon={CircleCheck} iconClassName="text-success-strong" title="Note saved" detail={state.savedNote?.transcript || 'No speech was detected.'}>
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => state.savedNote && onViewNote(state.savedNote.id)}>View note</Button>
            <Button onClick={() => { reset(); onClose() }}>Done</Button>
          </div>
          <Button variant="ghost" className="w-full" onClick={() => { reset(); void start() }}><Mic aria-hidden />Record another</Button>
        </Layout>
      )
    case 'error': {
      const kind = state.error?.kind ?? 'upload-failed'
      return (
        <Layout icon={kind === 'upload-failed' ? TriangleAlert : MicOff} iconClassName="text-danger-text" title={ERROR_TITLES[kind]} detail={state.error?.message} alert>
          {state.hasPendingRecording ? (
            <>
              <Button className={wide} onClick={retryUpload}><RotateCw aria-hidden />Retry upload</Button>
              <Button variant="secondary" className={`${wide} text-danger-text`} onClick={reset}>Discard recording</Button>
            </>
          ) : (
            <>
              <Button className={wide} onClick={() => { reset(); void start() }}><Mic aria-hidden />Try again</Button>
              <Button variant="secondary" className={wide} onClick={() => { reset(); onClose() }}>Close</Button>
            </>
          )}
        </Layout>
      )
    }
  }
}

type LayoutProps = {
  title: string
  detail?: string
  icon?: LucideIcon
  iconClassName?: string
  busy?: boolean
  alert?: boolean
  children?: ReactNode
}

// Icon/spinner, a title, a line of detail, then the actions.
function Layout({ title, detail, icon: Icon, iconClassName = 'text-secondary', busy, alert, children }: LayoutProps) {
  return (
    <div className="flex flex-col items-center gap-4 pt-2 text-center">
      <div role={alert ? 'alert' : 'status'} className="flex flex-col items-center gap-2">
        {busy ? <Spinner className="size-6" /> : Icon && <Icon aria-hidden className={`size-7 ${iconClassName}`} />}
        <p className="text-md font-semibold">{title}</p>
        {detail && <p className="line-clamp-4 max-w-sm text-secondary">{detail}</p>}
      </div>
      {children && <div className="flex w-full flex-col gap-2">{children}</div>}
    </div>
  )
}
