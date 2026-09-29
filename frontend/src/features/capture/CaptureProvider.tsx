// Lets any screen open the Capture menu, the "Start a task" sheet or the
// voice recorder, while the sheets themselves are rendered once, here.

import { createContext, useContext, useState, type ReactNode } from 'react'

import { CaptureSheet, type CaptureView } from '@/features/capture/CaptureSheet'
import { StartTaskSheet } from '@/features/capture/StartTaskSheet'
import { useRecorder } from '@/features/notes/RecorderProvider'
import { RecorderStatusPill } from '@/features/notes/RecorderStatusPill'

type CaptureContextValue = {
  openCapture: () => void
  openStartTask: () => void
  // Opens the recorder and, if it's free, starts recording straight away.
  openRecorder: () => void
}

const CaptureContext = createContext<CaptureContextValue | null>(null)

export function CaptureProvider({ children, bottomNavVisible }: { children: ReactNode; bottomNavVisible: boolean }) {
  const [view, setView] = useState<CaptureView | null>(null)
  const [isStartTaskOpen, setIsStartTaskOpen] = useState(false)
  const recorder = useRecorder()

  const openStartTask = () => {
    setView(null)
    setIsStartTaskOpen(true)
  }

  // Called from a tap, so the microphone request happens inside that user
  // gesture (browsers require one). Anything already in progress - or a
  // failed save waiting for Retry - is shown instead of starting over.
  const openRecorder = () => {
    setView('record')
    const { phase, hasPendingRecording } = recorder.state
    if (phase === 'success') recorder.reset()
    if ((phase === 'idle' || phase === 'success') && !hasPendingRecording) void recorder.start()
  }

  return (
    <CaptureContext.Provider value={{ openCapture: () => setView('menu'), openStartTask, openRecorder }}>
      {children}
      <CaptureSheet
        view={view}
        onViewChange={setView}
        onStartTask={openStartTask}
        onRecord={openRecorder}
      />
      <StartTaskSheet open={isStartTaskOpen} onOpenChange={setIsStartTaskOpen} />
      {view !== 'record' && <RecorderStatusPill onOpen={() => setView('record')} aboveBottomNav={bottomNavVisible} />}
    </CaptureContext.Provider>
  )
}

// Open Capture / Start task / Recorder. Must be used inside <CaptureProvider>.
export function useCapture(): CaptureContextValue {
  const context = useContext(CaptureContext)
  if (!context) throw new Error('useCapture() must be used inside <CaptureProvider>.')
  return context
}
