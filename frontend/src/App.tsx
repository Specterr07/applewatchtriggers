import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'

import { queryClient } from '@/api/queryClient'
import { Toaster } from '@/components/ui/Toaster'
import { AuthGate } from '@/features/auth/AuthGate'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ThemeProvider } from '@/hooks/useTheme'
import { router } from '@/router'

// App-level providers and routing only (spec §8.2). Screens live in
// features/, the frame around them in components/layout/.
export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthGate>
            <RouterProvider router={router} />
          </AuthGate>
        </AuthProvider>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
