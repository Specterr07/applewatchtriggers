import { NavLink } from 'react-router'

import { BrandMark } from '@/components/layout/BrandMark'
import { SETTINGS, SIDEBAR_INTEGRATIONS, SIDEBAR_MAIN, type NavItem } from '@/components/layout/navItems'
import { MEDIA_DESKTOP } from '@/config'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/utils/cn'

// Desktop/tablet navigation (spec §6). Full 240px sidebar with labels on
// desktop; a 72px icon rail on tablets, or anywhere when `forceCollapsed`
// is set (the canvas needs the room). Hidden on phones (BottomNav instead).
export function Sidebar({ forceCollapsed = false }: { forceCollapsed?: boolean }) {
  const isDesktop = useMediaQuery(MEDIA_DESKTOP)
  const isExpanded = isDesktop && !forceCollapsed

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface md:flex',
        isExpanded ? 'w-60 px-3' : 'w-[72px] items-center px-2',
      )}
    >
      <div className={cn('flex h-16 items-center', isExpanded && 'px-2')}>
        <BrandMark showName={isExpanded} />
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-1 pb-3">
        {SIDEBAR_MAIN.map((item) => (
          <SidebarLink key={item.path} item={item} isExpanded={isExpanded} />
        ))}

        {isExpanded ? (
          <p className="px-3 pt-5 pb-1 text-xs font-semibold tracking-wide text-secondary uppercase">
            Integrations
          </p>
        ) : (
          <hr className="mx-auto my-2 w-8" />
        )}
        {SIDEBAR_INTEGRATIONS.map((item) => (
          <SidebarLink key={item.path} item={item} isExpanded={isExpanded} />
        ))}

        <div className="mt-auto">
          <SidebarLink item={SETTINGS} isExpanded={isExpanded} />
        </div>
      </nav>
    </aside>
  )
}

// One sidebar entry. In the icon rail the label becomes a tooltip and an
// accessible name, since there's no visible text.
function SidebarLink({ item, isExpanded }: { item: NavItem; isExpanded: boolean }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      title={isExpanded ? undefined : item.label}
      aria-label={isExpanded ? undefined : item.label}
      className={({ isActive }) =>
        cn(
          'group flex h-11 items-center gap-3 rounded-control text-base font-medium transition-colors',
          isExpanded ? 'px-3' : 'w-11 justify-center',
          isActive
            ? 'bg-surface-muted text-foreground'
            : 'text-secondary hover:bg-surface-muted hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon aria-hidden className={cn('size-[18px] shrink-0', isActive && 'text-accent-text')} />
          {isExpanded && <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  )
}
