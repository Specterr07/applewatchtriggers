import type { ReactNode } from 'react'
import { Drawer } from 'vaul'

// Mobile bottom sheet (spec §6: sheets instead of small dialogs on phones).
// vaul provides swipe-down-to-close, backdrop tap, Esc, and focus trapping.
type SheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}

export function Sheet({ open, onOpenChange, title, description, children }: SheetProps) {
  return (
    // autoFocus: vaul leaves focus behind the sheet by default; the spec
    // (§6.1) needs it moved inside so keyboard and screen-reader users land in it.
    <Drawer.Root open={open} onOpenChange={onOpenChange} autoFocus>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Drawer.Content
          // Without a description, tell the dialog not to expect one (avoids an a11y warning).
          {...(description ? {} : { 'aria-describedby': undefined })}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-card border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-raised outline-none"
        >
          <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border" />
          <div className="px-4 pt-3 pb-2">
            <Drawer.Title className="text-md font-semibold">{title}</Drawer.Title>
            {description && (
              <Drawer.Description className="mt-0.5 text-base text-secondary">
                {description}
              </Drawer.Description>
            )}
          </div>
          <div className="overflow-y-auto px-4 pb-4">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
