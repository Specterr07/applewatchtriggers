import { Button } from '@/components/ui/Button'
import { ResponsiveDialog } from '@/components/ui/ResponsiveDialog'
import { Spinner } from '@/components/ui/Spinner'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  isPending?: boolean
}

// "Are you sure?" for destructive actions: a bottom sheet on phones, a
// dialog otherwise. The confirm button uses the danger style; Cancel is
// equally easy to reach so nothing is deleted by a stray tap.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  isPending = false,
}: ConfirmDialogProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isPending}>
          {isPending && <Spinner className="text-on-accent" />}
          {confirmLabel}
        </Button>
      </div>
    </ResponsiveDialog>
  )
}
