import { Dialog, type DialogProps } from '@/components/ui/Dialog'
import { Sheet } from '@/components/ui/Sheet'
import { MEDIA_HAS_SIDEBAR } from '@/config'
import { useMediaQuery } from '@/hooks/useMediaQuery'

// A bottom sheet on phones, a centered dialog on tablet/desktop (spec §6:
// "mobile bottom sheets instead of tiny dialogs"). Same props either way.
export function ResponsiveDialog(props: DialogProps) {
  const hasSidebar = useMediaQuery(MEDIA_HAS_SIDEBAR)
  return hasSidebar ? <Dialog {...props} /> : <Sheet {...props} />
}
