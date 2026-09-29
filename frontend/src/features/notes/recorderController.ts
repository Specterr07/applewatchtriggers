// The voice-note recorder (spec §4.5), as plain TypeScript so every state
// change can be unit-tested with fake microphone/recorder/upload parts.
//
//   idle ─start─► requesting ─mic ok─► recording ─stop─► uploading ─sent─► processing ─► success
//                     │                   │                  │                 │
//                     └─mic refused─► error ◄──── upload/transcription failed ─┘
//                                     (recording kept in memory → Retry / Discard)
//   recording ─cancel─► idle (recording discarded, nothing uploaded)
//
// Kept from the old webpage: Retry re-sends the SAME recording; Cancel
// discards; the file extension follows the recorder's MIME type (Safari
// records mp4); the microphone is always released when recording ends.

import { ApiError } from '@/api/client'
import type { Note } from '@/types/note'

export type RecorderPhase = 'idle' | 'requesting' | 'recording' | 'uploading' | 'processing' | 'success' | 'error'

export type RecorderErrorKind =
  | 'unsupported' // browser can't record (or page isn't served securely)
  | 'permission-denied'
  | 'no-microphone'
  | 'microphone-busy'
  | 'empty-recording'
  | 'upload-failed' // network, server, or transcription failure

export type RecorderState = {
  phase: RecorderPhase
  startedAt: number | null // local clock (ms) when recording began, for the timer
  error: { kind: RecorderErrorKind; message: string } | null
  hasPendingRecording: boolean // an unsaved recording is being kept for Retry
  savedNote: Note | null
}

// The small parts of the browser APIs we use, so tests can pass fakes.
export type StreamLike = { getTracks(): { stop(): void }[] }
export type RecorderLike = {
  mimeType: string
  start(): void
  stop(): void
  ondataavailable: ((event: { data: Blob }) => void) | null
  onstop: (() => void) | null
}
export type RecorderDeps = {
  isSupported(): boolean
  requestMicrophone(): Promise<StreamLike>
  createRecorder(stream: StreamLike): RecorderLike
  upload(audio: Blob, filename: string, onUploaded: () => void): Promise<Note>
  now(): number
  onNoteSaved?(note: Note): void
}

export const INITIAL_RECORDER_STATE: RecorderState = {
  phase: 'idle',
  startedAt: null,
  error: null,
  hasPendingRecording: false,
  savedNote: null,
}

// Browser microphone errors -> a message the user can act on.
function microphoneError(err: unknown): RecorderState['error'] {
  const name = typeof err === 'object' && err !== null && 'name' in err ? String(err.name) : ''
  if (['NotAllowedError', 'SecurityError', 'PermissionDeniedError'].includes(name)) {
    return { kind: 'permission-denied', message: 'Microphone access is blocked. Allow it in your browser’s site settings, then try again.' }
  }
  if (['NotFoundError', 'DevicesNotFoundError', 'OverconstrainedError'].includes(name)) {
    return { kind: 'no-microphone', message: 'No microphone was found. Connect one and try again.' }
  }
  return { kind: 'microphone-busy', message: 'The microphone couldn’t be started - another app may be using it.' }
}

// Same naming rule as the old webpage: Safari's mp4, everything else webm.
export function recordingFilename(mimeType: string): string {
  return `recording.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`
}

export function createRecorderController(deps: RecorderDeps) {
  let state = INITIAL_RECORDER_STATE
  const listeners = new Set<() => void>()
  let pendingRecording: Blob | null = null
  // Each start() gets its own session object, so a late event from a
  // cancelled recording can never leak into the next one.
  let session: { stream: StreamLike | null; recorder: RecorderLike | null; chunks: Blob[]; cancelled: boolean } | null = null

  const setState = (changes: Partial<RecorderState>) => {
    state = { ...state, ...changes, hasPendingRecording: pendingRecording !== null }
    listeners.forEach((listener) => listener())
  }

  const releaseMicrophone = (target: NonNullable<typeof session>) => {
    target.stream?.getTracks().forEach((track) => track.stop())
    target.stream = null
  }

  async function upload() {
    const audio = pendingRecording
    if (!audio) return
    setState({ phase: 'uploading', error: null, startedAt: null })
    try {
      const note = await deps.upload(audio, recordingFilename(audio.type), () => {
        if (state.phase === 'uploading') setState({ phase: 'processing' })
      })
      pendingRecording = null
      setState({ phase: 'success', savedNote: note })
      deps.onNoteSaved?.(note)
    } catch (err) {
      // A 400 means the server rejected the file itself (e.g. empty), so
      // retrying the same bytes can't help. Anything else - offline, a
      // transcription/storage failure - keeps the recording for Retry.
      if (err instanceof ApiError && err.status === 400) pendingRecording = null
      const message =
        err instanceof ApiError && err.status === 0
          ? 'Couldn’t reach the server. Your recording is kept - try again when you’re back online.'
          : err instanceof Error
            ? err.message
            : String(err)
      setState({ phase: 'error', error: { kind: 'upload-failed', message } })
    }
  }

  function handleStopped(ended: NonNullable<typeof session>) {
    releaseMicrophone(ended)
    if (session === ended) session = null
    if (ended.cancelled) return
    const recorded = new Blob(ended.chunks, { type: ended.recorder?.mimeType || 'audio/webm' })
    if (recorded.size === 0) {
      setState({ phase: 'error', startedAt: null, error: { kind: 'empty-recording', message: 'Nothing was recorded. Check your microphone and try again.' } })
      return
    }
    pendingRecording = recorded
    void upload()
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    // Only from a resting state, so a double tap can't start two recordings.
    // An unsaved recording must be retried or discarded first - it's never
    // silently thrown away by starting a new one.
    async start() {
      if (!['idle', 'success', 'error'].includes(state.phase) || pendingRecording) return
      if (!deps.isSupported()) {
        setState({ phase: 'error', error: { kind: 'unsupported', message: 'This browser can’t record audio here. Try a current browser over HTTPS.' } })
        return
      }
      const current: NonNullable<typeof session> = { stream: null, recorder: null, chunks: [], cancelled: false }
      session = current
      setState({ phase: 'requesting', error: null, savedNote: null, startedAt: null })

      try {
        current.stream = await deps.requestMicrophone()
      } catch (err) {
        if (current.cancelled) return
        session = null
        setState({ phase: 'error', error: microphoneError(err) })
        return
      }
      // Cancelled while the permission prompt was open: let go of the mic.
      if (current.cancelled) return releaseMicrophone(current)

      try {
        const recorder = deps.createRecorder(current.stream)
        current.recorder = recorder
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) current.chunks.push(event.data)
        }
        recorder.onstop = () => handleStopped(current)
        recorder.start()
      } catch (err) {
        releaseMicrophone(current)
        session = null
        setState({ phase: 'error', error: microphoneError(err) })
        return
      }
      setState({ phase: 'recording', startedAt: deps.now() })
    },

    // Finish recording and send it (the upload starts once the recorder
    // has handed over its last chunk).
    stop() {
      if (state.phase !== 'recording' || !session?.recorder) return
      setState({ phase: 'uploading', startedAt: null })
      session.recorder.stop()
    },

    // Throw the recording away without uploading anything.
    cancel() {
      if (!session || !['requesting', 'recording'].includes(state.phase)) return
      session.cancelled = true
      if (session.recorder) session.recorder.stop()
      else session = null
      setState({ phase: 'idle', startedAt: null, error: null })
    },

    // Send the kept recording again after a failure.
    retryUpload() {
      if (state.phase === 'error' && pendingRecording) void upload()
    },

    // Close out a finished or failed attempt (discards any kept recording).
    reset() {
      if (!['success', 'error'].includes(state.phase)) return
      pendingRecording = null
      setState({ ...INITIAL_RECORDER_STATE })
    },

    // App is unmounting (e.g. sign-out): stop recording, free the mic.
    dispose() {
      if (session) {
        session.cancelled = true
        session.recorder?.stop()
        releaseMicrophone(session)
        session = null
      }
      pendingRecording = null
      listeners.clear()
    },
  }
}

export type RecorderController = ReturnType<typeof createRecorderController>
