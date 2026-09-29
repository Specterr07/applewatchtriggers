// App-level sign-in state (spec §4.1). Behaves like static/index.html:
// same localStorage keys, same 24h sliding expiry, and any 401 from the
// server signs you out with a message. Only the UI around it is new.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

import { ApiError, setUnauthorizedHandler } from '@/api/client'
import { queryClient } from '@/api/queryClient'
import { isApiKeyValid } from '@/api/tasks'
import { clearSession, getStoredApiKey, isSessionExpired, storeApiKey, touchSession } from '@/utils/session'

// checking    - verifying a stored key on load
// signed-in   - key accepted, show the app
// signed-out  - show the login screen (with `message` if there is one)
// unreachable - a stored key exists but the server couldn't be reached
export type AuthStatus = 'checking' | 'signed-in' | 'signed-out' | 'unreachable'

type AuthContextValue = {
  status: AuthStatus
  message: string | null
  // Resolves once the attempt finishes; the outcome shows up in status/message.
  signIn: (apiKey: string) => Promise<void>
  signOut: (message?: string) => void
  retryStoredKey: () => Promise<void>
}

const EXPIRED_MESSAGE = 'Your session expired. Please log in again.'
const REJECTED_MESSAGE = 'Your session is no longer valid. Please log in again.'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [message, setMessage] = useState<string | null>(null)

  const signOut = useCallback((reason?: string) => {
    clearSession()
    // Drop cached tasks/notes so the next sign-in never shows this session's data.
    queryClient.clear()
    setMessage(reason ?? null)
    setStatus('signed-out')
  }, [])

  // Re-checks the key already saved in this browser (page load / Retry).
  const retryStoredKey = useCallback(async () => {
    const storedKey = getStoredApiKey()
    if (!storedKey) {
      setStatus('signed-out')
      return
    }
    if (isSessionExpired()) {
      signOut(EXPIRED_MESSAGE)
      return
    }
    setStatus('checking')
    try {
      if (await isApiKeyValid(storedKey)) {
        touchSession()
        setMessage(null)
        setStatus('signed-in')
      } else {
        // The key was rotated on the server since this browser saved it.
        signOut(REJECTED_MESSAGE)
      }
    } catch (err) {
      // Offline or server down: keep the saved key so Retry can use it
      // later, rather than making the user type it again.
      setMessage(err instanceof ApiError ? err.message : String(err))
      setStatus('unreachable')
    }
  }, [signOut])

  const signIn = useCallback(async (apiKey: string) => {
    const trimmedKey = apiKey.trim()
    if (!trimmedKey) return
    try {
      if (await isApiKeyValid(trimmedKey)) {
        storeApiKey(trimmedKey)
        touchSession()
        setMessage(null)
        setStatus('signed-in')
      } else {
        setMessage('Incorrect key. Try again.')
      }
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : String(err))
    }
  }, [])

  // Check the stored key once on load.
  useEffect(() => {
    // Deliberately not awaited: the effect can't be async.
    void retryStoredKey()
  }, [retryStoredKey])

  // Any authenticated request that comes back 401 signs the user out.
  useEffect(() => {
    setUnauthorizedHandler(() => signOut(REJECTED_MESSAGE))
    return () => setUnauthorizedHandler(null)
  }, [signOut])

  // Catches a tab left in the background past the expiry window, instead
  // of waiting for the next request to fail.
  useEffect(() => {
    const checkExpiryOnReturn = () => {
      if (document.visibilityState === 'visible' && status === 'signed-in' && isSessionExpired()) {
        signOut(EXPIRED_MESSAGE)
      }
    }
    document.addEventListener('visibilitychange', checkExpiryOnReturn)
    return () => document.removeEventListener('visibilitychange', checkExpiryOnReturn)
  }, [status, signOut])

  return (
    <AuthContext.Provider value={{ status, message, signIn, signOut, retryStoredKey }}>
      {children}
    </AuthContext.Provider>
  )
}

// Sign-in state and actions. Must be used inside <AuthProvider>.
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth() must be used inside <AuthProvider>.')
  return context
}
