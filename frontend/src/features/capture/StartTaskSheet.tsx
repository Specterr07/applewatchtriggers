import { Play } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ResponsiveDialog } from '@/components/ui/ResponsiveDialog'
import { Spinner } from '@/components/ui/Spinner'
import { getRecentTaskNames } from '@/features/capture/recentTaskNames'
import { useGuardedToggle } from '@/hooks/useGuardedToggle'
import { useTasks } from '@/hooks/useTasks'

type StartTaskSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// "What are you working on?" (spec §4.3). The name is optional - left
// blank, the backend titles it like "Task – Fri, 9:00 AM", same as a Watch tap.
export function StartTaskSheet({ open, onOpenChange }: StartTaskSheetProps) {
  const [name, setName] = useState('')
  const { data: tasks } = useTasks()
  const { toggle, isPending } = useGuardedToggle()

  const recentNames = getRecentTaskNames(tasks ?? [])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setName('') // start fresh next time
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    await toggle({ action: 'Start', name })
    // Close either way: on a conflict the toast explains what happened and
    // the refreshed screen already shows the running task.
    handleOpenChange(false)
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange} title="Start a task">
      <form onSubmit={handleSubmit}>
        <label htmlFor="task-name" className="mb-1.5 block text-sm font-medium">
          What are you working on?
        </label>
        <Input
          id="task-name"
          autoFocus
          autoComplete="off"
          placeholder="Optional"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        {recentNames.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-medium text-secondary">Recent</p>
            <ul className="flex flex-wrap gap-2">
              {recentNames.map((recentName) => (
                <li key={recentName}>
                  <button
                    type="button"
                    onClick={() => setName(recentName)}
                    aria-pressed={name === recentName}
                    className="h-11 max-w-[16rem] cursor-pointer truncate rounded-full border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted aria-pressed:border-accent-strong aria-pressed:text-accent-text"
                  >
                    {recentName}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button type="submit" className="mt-5 w-full" disabled={isPending}>
          {isPending ? <Spinner className="text-on-accent" /> : <Play aria-hidden />}
          {isPending ? 'Starting…' : 'Start'}
        </Button>
      </form>
    </ResponsiveDialog>
  )
}
