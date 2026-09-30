// Every screen's URL (spec §5.2). routes/pages.py serves index.html for
// exactly these paths - keep the two lists in step (tests/test_page_routing.py).

import { lazy } from 'react'
import { createBrowserRouter } from 'react-router'

import { AppShell } from '@/components/layout/AppShell'
import { MorePage } from '@/components/layout/MorePage'
import { NotFoundPage } from '@/components/layout/NotFoundPage'
import { RouteErrorPage } from '@/components/layout/RouteErrorPage'
import { ROUTER_BASENAME } from '@/config'
import { HomePage } from '@/features/home/HomePage'
import { NotesPage } from '@/features/notes/NotesPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { TelegramPage } from '@/features/telegram/TelegramPage'
import { TasksPage } from '@/features/tasks/TasksPage'
import { TimeLogPage } from '@/features/timelog/TimeLogPage'
import { WatchPage } from '@/features/watch/WatchPage'

// tldraw is large (~500 KB gzipped). Lazy-loading keeps it out of the
// initial bundle; it's only downloaded when /canvas is opened.
const CanvasPage = lazy(() => import('@/features/canvas/CanvasPage'))

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppShell />,
      errorElement: <RouteErrorPage />,
      children: [
        { index: true, element: <HomePage /> },
        // TasksPage reads :taskId itself and shows the detail as a drawer
        // (tablet/desktop) or a full screen (phone), keeping list state.
        { path: 'tasks', element: <TasksPage />, children: [{ path: ':taskId' }] },
        { path: 'time-log', element: <TimeLogPage /> },
        // Same pattern as tasks: NotesPage reads :noteId itself.
        { path: 'notes', element: <NotesPage />, children: [{ path: ':noteId' }] },

        { path: 'integrations/watch', element: <WatchPage /> },
        { path: 'integrations/telegram', element: <TelegramPage /> },

        { path: 'canvas', element: <CanvasPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'more', element: <MorePage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: ROUTER_BASENAME },
)
