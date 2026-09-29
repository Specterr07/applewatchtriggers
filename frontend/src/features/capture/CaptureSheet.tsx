import { ChevronRight, Mic, PenTool, Play, Square, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'

import { ResponsiveDialog } from '@/components/ui/ResponsiveDialog'
import { Spinner } from '@/components/ui/Spinner'
import { RecorderPanel } from '@/features/notes/RecorderPanel'
import { useRecorder } from '@/features/notes/RecorderProvider'
import { useGuardedToggle } from '@/hooks/useGuardedToggle'
import { findActiveTask, useTasks } from '@/hooks/useTasks'

export type CaptureView = 'menu' | 'record'

type CaptureSheetProps = {
  view: CaptureView | null // null = closed
  onViewChange: (view: CaptureView | null) => void
  onStartTask: () => void
  onRecord: () => void
}

const ROW_CLASS =
  'flex h-14 w-full cursor-pointer items-center gap-3 rounded-control px-2 text-left hover:bg-surface-muted disabled:cursor-default disabled:opacity-60'

// The Capture sheet (spec §4.7): start or stop a task, record a voice note,
// open the canvas. The recorder runs inside the same sheet; closing it
// mid-recording is fine - the recording carries on and a status pill shows it.
export function CaptureSheet({ view, onViewChange, onStartTask, onRecord }: CaptureSheetProps) {
  const { data: tasks } = useTasks()
  const activeTask = findActiveTask(tasks)
  const { toggle, isPending } = useGuardedToggle()
  const { state: recorder } = useRecorder()
  const navigate = useNavigate()

  const close = () => onViewChange(null)
  const stopActiveTask = async () => {
    await toggle({ action: 'End' })
    close()
  }
  const recorderBusy = !['idle', 'success'].includes(recorder.phase)

  return (
    <ResponsiveDialog
      open={view !== null}
      onOpenChange={(open) => !open && close()}
      title={view === 'record' ? 'Voice note' : 'Capture'}
    >
      {view === 'record' ? (
        <RecorderPanel
          onClose={close}
          onViewNote={(noteId) => {
            close()
            navigate(`/notes/${noteId}`)
          }}
        />
      ) : (
        <ul className="flex flex-col gap-1">
          <li>
            {activeTask ? (
              <button type="button" className={ROW_CLASS} onClick={stopActiveTask} disabled={isPending}>
                <RowIcon icon={Square} />
                <RowText title="Stop task" detail={activeTask.name} />
                {isPending && <Spinner />}
              </button>
            ) : (
              <button type="button" className={ROW_CLASS} onClick={onStartTask}>
                <RowIcon icon={Play} />
                <RowText title="Start a task" />
                <ChevronRight aria-hidden className="size-4 text-secondary" />
              </button>
            )}
          </li>
          <li>
            <button type="button" className={ROW_CLASS} onClick={recorderBusy ? () => onViewChange('record') : onRecord}>
              <RowIcon icon={Mic} />
              <RowText title="Record a voice note" detail={recorderBusy ? 'In progress - tap to view' : undefined} />
              <ChevronRight aria-hidden className="size-4 text-secondary" />
            </button>
          </li>
          <li>
            <Link to="/canvas" onClick={close} className={ROW_CLASS}>
              <RowIcon icon={PenTool} />
              <RowText title="Open canvas" />
              <ChevronRight aria-hidden className="size-4 text-secondary" />
            </Link>
          </li>
        </ul>
      )}
    </ResponsiveDialog>
  )
}

function RowIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-muted text-foreground">
      <Icon className="size-5" />
    </span>
  )
}

// Row label, with an optional second line (e.g. the running task's name).
function RowText({ title, detail }: { title: string; detail?: ReactNode }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block font-medium">{title}</span>
      {detail && <span className="block truncate text-sm text-secondary">{detail}</span>}
    </span>
  )
}
