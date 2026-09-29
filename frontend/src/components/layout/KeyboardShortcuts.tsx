import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { CANVAS, NOTES, TASKS } from '@/components/layout/navItems'
import { ResponsiveDialog } from '@/components/ui/ResponsiveDialog'
import { useCapture } from '@/features/capture/CaptureProvider'
import { useGuardedToggle } from '@/hooks/useGuardedToggle'
import { useShortcuts, type ShortcutAction } from '@/hooks/useShortcuts'
import { findActiveTask, useTasks } from '@/hooks/useTasks'

// What the "?" help lists (spec §6.2).
const SHORTCUT_HELP: { keys: string[]; description: string }[] = [
  { keys: ['C'], description: 'Open Capture' },
  { keys: ['S'], description: 'Start a task, or stop the running one' },
  { keys: ['/'], description: 'Search Tasks or Notes' },
  { keys: ['G', 'H'], description: 'Go to Home' },
  { keys: ['G', 'T'], description: 'Go to Tasks' },
  { keys: ['G', 'L'], description: 'Go to Time Log' },
  { keys: ['G', 'N'], description: 'Go to Notes' },
  { keys: ['?'], description: 'Show these shortcuts' },
  { keys: ['Esc'], description: 'Close a sheet, drawer or dialog' },
]

// Wires the keyboard shortcuts to the app, and renders the "?" help.
// Turned off on the canvas, where tldraw has its own shortcuts.
export function KeyboardShortcuts() {
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { openCapture, openStartTask } = useCapture()
  const { toggle, isPending } = useGuardedToggle()
  const { data: tasks } = useTasks()

  const isCanvas = pathname.startsWith(CANVAS.path)

  useShortcuts(!isCanvas, (action: ShortcutAction) => {
    switch (action.type) {
      case 'capture':
        return openCapture()
      case 'start-stop':
        if (isPending) return
        // Stopping never needs a name, so it happens straight away (spec §4.3).
        return findActiveTask(tasks) ? void toggle({ action: 'End' }) : openStartTask()
      case 'focus-search': {
        if (!pathname.startsWith(TASKS.path) && !pathname.startsWith(NOTES.path)) return
        document.querySelector<HTMLInputElement>('#main input[type="search"]')?.focus()
        return
      }
      case 'show-help':
        return setIsHelpOpen(true)
      case 'go':
        return navigate(action.path)
    }
  })

  return (
    <ResponsiveDialog open={isHelpOpen} onOpenChange={setIsHelpOpen} title="Keyboard shortcuts">
      <dl className="divide-y divide-border">
        {SHORTCUT_HELP.map((shortcut) => (
          <div key={shortcut.description} className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-secondary">{shortcut.description}</dt>
            <dd className="flex shrink-0 items-center gap-1">
              {shortcut.keys.map((key, index) => (
                <span key={key} className="flex items-center gap-1">
                  {index > 0 && <span className="text-sm text-secondary">then</span>}
                  <kbd className="min-w-7 rounded border border-border bg-surface-muted px-1.5 py-0.5 text-center font-mono text-sm">
                    {key}
                  </kbd>
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-secondary">Shortcuts are off while typing and on the canvas.</p>
    </ResponsiveDialog>
  )
}
