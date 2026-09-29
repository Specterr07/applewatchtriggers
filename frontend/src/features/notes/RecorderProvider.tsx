// Makes the one app-wide recorder available to any screen (Capture sheet,
// Notes, the status pill), so a recording keeps going while you navigate.

import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { toast } from 'sonner'

import { createNote } from '@/api/notes'
import { QUERY_KEYS } from '@/api/queryClient'
import { createRecorderController, type RecorderController, type RecorderLike, type RecorderState } from '@/features/notes/recorderController'
import type { Note } from '@/types/note'

type RecorderContextValue = Omit<RecorderController, 'getState' | 'subscribe' | 'dispose'> & { state: RecorderState }

const RecorderContext = createContext<RecorderContextValue | null>(null)

// The real browser pieces the controller needs.
function createBrowserRecorder(onNoteSaved: (note: Note) => void) {
  return createRecorderController({
    // getUserMedia only exists in secure contexts (HTTPS or localhost).
    isSupported: () => Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined',
    requestMicrophone: () => navigator.mediaDevices.getUserMedia({ audio: true }),
    // A real MediaRecorder fits RecorderLike (its BlobEvent has the `data`
    // the controller reads); TypeScript just can't match the handler types.
    createRecorder: (stream) => new MediaRecorder(stream as MediaStream) as unknown as RecorderLike,
    upload: createNote,
    now: () => performance.now(),
    onNoteSaved,
  })
}

export function RecorderProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const onSavedRef = useRef<() => void>(() => {})
  onSavedRef.current = () => {
    // Refetch notes so the Notes list and Home's recent activity show it.
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes })
    toast.success('Voice note saved')
  }

  // Created once; the saved-note callback goes through a ref so it always
  // uses the current queryClient without recreating the recorder.
  const [controller] = useState(() => createBrowserRecorder(() => onSavedRef.current()))
  const state = useSyncExternalStore(controller.subscribe, controller.getState)

  // Leaving the app (e.g. signing out): stop recording and free the mic.
  useEffect(() => () => controller.dispose(), [controller])

  // Closing the tab mid-recording or with an unsaved recording would lose
  // it, so ask the browser to confirm first.
  const isHoldingAudio = ['recording', 'uploading', 'processing'].includes(state.phase) || state.hasPendingRecording
  useEffect(() => {
    if (!isHoldingAudio) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isHoldingAudio])

  const value: RecorderContextValue = {
    state,
    start: controller.start,
    stop: controller.stop,
    cancel: controller.cancel,
    retryUpload: controller.retryUpload,
    reset: controller.reset,
  }
  return <RecorderContext.Provider value={value}>{children}</RecorderContext.Provider>
}

// The recorder's state and actions. Must be used inside <RecorderProvider>.
export function useRecorder(): RecorderContextValue {
  const context = useContext(RecorderContext)
  if (!context) throw new Error('useRecorder() must be used inside <RecorderProvider>.')
  return context
}
