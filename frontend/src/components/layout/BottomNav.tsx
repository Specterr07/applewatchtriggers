import { Ellipsis, Plus } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'

import { MOBILE_MORE, NOTES, OVERVIEW, TASKS, type NavItem } from '@/components/layout/navItems'
import { useCapture } from '@/features/capture/CaptureProvider'
import { cn } from '@/utils/cn'

const MORE_TAB: NavItem = { path: '/more', label: 'More', icon: Ellipsis }

// Phone navigation: Home · Notes · Capture · Tasks · More. Notes sit next
// to Home because recording notes is the app's main job.
// Fixed to the bottom and padded for the iPhone home indicator.
export function BottomNav() {
  const { pathname } = useLocation()
  const { openCapture } = useCapture()
  // "More" stays highlighted while you're on any screen reached through it.
  const isInMoreSection = MOBILE_MORE.some((item) => pathname.startsWith(item.path))

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid h-16 grid-cols-5">
        <BottomNavLink item={OVERVIEW} />
        <BottomNavLink item={NOTES} />
        <li className="grid place-items-center">
          <button
            type="button"
            onClick={openCapture}
            aria-label="Capture"
            className="grid size-12 cursor-pointer place-items-center rounded-full bg-accent-strong text-on-accent shadow-raised transition-transform active:scale-95"
          >
            <Plus aria-hidden className="size-6" strokeWidth={2.25} />
          </button>
        </li>
        <BottomNavLink item={TASKS} />
        <BottomNavLink item={MORE_TAB} forceActive={isInMoreSection} />
      </ul>
    </nav>
  )
}

// One tab: icon above a short label, the whole cell is the tap target.
function BottomNavLink({ item, forceActive = false }: { item: NavItem; forceActive?: boolean }) {
  const Icon = item.icon
  return (
    <li>
      <NavLink
        to={item.path}
        end={item.path === '/'}
        className={({ isActive }) =>
          cn(
            'flex h-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
            isActive || forceActive ? 'text-accent-text' : 'text-secondary',
          )
        }
      >
        <Icon aria-hidden className="size-[22px]" />
        {item.mobileLabel ?? item.label}
      </NavLink>
    </li>
  )
}
