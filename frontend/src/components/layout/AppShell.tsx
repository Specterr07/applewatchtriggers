import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router'

import { BottomNav } from '@/components/layout/BottomNav'
import { CANVAS } from '@/components/layout/navItems'
import { Sidebar } from '@/components/layout/Sidebar'
import { Spinner } from '@/components/ui/Spinner'
import { CaptureProvider } from '@/features/capture/CaptureProvider'
import { RecorderProvider } from '@/features/notes/RecorderProvider'

// The frame around every screen: sidebar (tablet/desktop) or bottom nav
// (phone), with the current route rendered in the middle. The recorder
// wraps everything so a recording keeps going while you move between screens.
export function AppShell() {
  const { pathname } = useLocation()

  // The canvas takes the whole screen: no bottom nav on phones, icon-only
  // sidebar on desktop (spec §5.2).
  const isCanvas = pathname.startsWith(CANVAS.path)
  // Phones show task/note detail full-screen with its own Back button (spec §6).
  const isDetailScreen = /^\/(tasks|notes)\/[^/]+/.test(pathname)
  const hidesBottomNav = isCanvas || isDetailScreen

  return (
    <RecorderProvider>
      <CaptureProvider bottomNavVisible={!hidesBottomNav}>
        <div className="min-h-dvh md:flex">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2"
          >
            Skip to content
          </a>

          <Sidebar forceCollapsed={isCanvas} />

          <main
            id="main"
            // Leaves room for the fixed bottom nav (64px + iPhone home indicator).
            className={
              hidesBottomNav ? 'min-w-0 flex-1' : 'min-w-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0'
            }
          >
            {/* Shown while a lazy-loaded screen (the canvas) downloads. */}
            <Suspense
              fallback={
                <div className="grid h-dvh place-items-center">
                  <Spinner label="Loading" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </main>

          {!hidesBottomNav && <BottomNav />}
        </div>
      </CaptureProvider>
    </RecorderProvider>
  )
}
