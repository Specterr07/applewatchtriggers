import type { ReactNode } from 'react'

import { BrandMark } from '@/components/layout/BrandMark'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/AuthProvider'
import { LoginScreen } from '@/features/auth/LoginScreen'

// Shows the app only once signed in. It's a gate, not a route: the URL
// never changes, so after logging in you land on the page you opened.
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'signed-in') return <>{children}</>

  if (status === 'checking') {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <BrandMark />
          <Spinner label="Checking your session" />
        </div>
      </div>
    )
  }

  return <LoginScreen />
}
