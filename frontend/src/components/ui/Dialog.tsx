import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/Button'

// Centered dialog for tablet/desktop (phones get a Sheet instead - use
// ResponsiveDialog to pick automatically). Radix handles focus trapping,
// Esc, backdrop clicks and screen-reader labelling.
export type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}

export function Dialog({ open, onOpenChange, title, description, children }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <DialogPrimitive.Content
          // Without a description, tell the dialog not to expect one (avoids an a11y warning).
          {...(description ? {} : { 'aria-describedby': undefined })}
          className="fixed top-[18vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-card border border-border bg-surface shadow-raised outline-none"
        >
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-2">
            <div className="pt-2.5">
              <DialogPrimitive.Title className="text-md font-semibold">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-0.5 text-base text-secondary">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close" className="-mr-2">
                <X aria-hidden />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="px-5 pb-5">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
