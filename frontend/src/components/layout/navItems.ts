// Every navigation destination, defined once and shared by the desktop
// Sidebar, the mobile BottomNav, and the mobile More page (spec §5.1).

import {
  Clock,
  LayoutDashboard,
  ListChecks,
  Mic,
  PenTool,
  Send,
  Settings,
  Watch,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  path: string
  label: string
  icon: LucideIcon
  // Some screens are named differently in the mobile nav (Overview -> Home).
  mobileLabel?: string
}

export const OVERVIEW: NavItem = { path: '/', label: 'Overview', mobileLabel: 'Home', icon: LayoutDashboard }
export const TASKS: NavItem = { path: '/tasks', label: 'Tasks', icon: ListChecks }
export const TIME_LOG: NavItem = { path: '/time-log', label: 'Time Log', icon: Clock }
export const NOTES: NavItem = { path: '/notes', label: 'Notes', icon: Mic }
export const CANVAS: NavItem = { path: '/canvas', label: 'Canvas', icon: PenTool }
export const APPLE_WATCH: NavItem = { path: '/integrations/watch', label: 'Apple Watch', icon: Watch }
export const TELEGRAM: NavItem = { path: '/integrations/telegram', label: 'Telegram', icon: Send }
export const SETTINGS: NavItem = { path: '/settings', label: 'Settings', icon: Settings }

// Desktop sidebar sections.
export const SIDEBAR_MAIN = [OVERVIEW, TASKS, TIME_LOG, NOTES, CANVAS]
export const SIDEBAR_INTEGRATIONS = [APPLE_WATCH, TELEGRAM]

// Mobile: what sits behind the "More" tab (everything not in the bottom bar).
export const MOBILE_MORE = [TIME_LOG, CANVAS, APPLE_WATCH, TELEGRAM, SETTINGS]
