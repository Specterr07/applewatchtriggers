import type { CSSProperties } from 'react'
import { Toaster as SonnerToaster } from 'sonner'

import { MEDIA_HAS_SIDEBAR } from '@/config'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useTheme } from '@/hooks/useTheme'

// Sonner's own CSS variables, pointed at our design tokens so toasts match
// the app (and follow Light/Dark) instead of sonner's default look.
const TOKEN_STYLES = {
  '--normal-bg': 'var(--surface)',
  '--normal-text': 'var(--text)',
  '--normal-border': 'var(--border)',
  '--border-radius': 'var(--radius-card)',
} as CSSProperties

// Where toast messages appear. On phones they sit centered just above the
// bottom nav; with a sidebar they go bottom-right, out of the way.
export function Toaster() {
  const { resolvedTheme } = useTheme()
  const hasSidebar = useMediaQuery(MEDIA_HAS_SIDEBAR)

  return (
    <SonnerToaster
      theme={resolvedTheme}
      position={hasSidebar ? 'bottom-right' : 'bottom-center'}
      mobileOffset={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 12px)' }}
      style={TOKEN_STYLES}
      toastOptions={{ className: 'font-sans text-base shadow-raised' }}
    />
  )
}
