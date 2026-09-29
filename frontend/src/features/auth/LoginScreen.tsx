import { KeyRound, RotateCw } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { BrandMark } from '@/components/layout/BrandMark'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/AuthProvider'

// API-key sign-in. Also shown when a saved session expired or the server
// couldn't be reached (with a Retry that reuses the saved key).
export function LoginScreen() {
  const { status, message, signIn, retryStoredKey } = useAuth()
  const [apiKey, setApiKey] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isUnreachable = status === 'unreachable'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    await signIn(apiKey)
    setIsSubmitting(false)
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size="lg" />
          <h1 className="mt-5 text-xl font-semibold tracking-tight">Sign in to Sheev</h1>
          <p className="mt-1 text-base text-secondary-on-bg">
            Enter your API key to continue.
          </p>
        </div>

        <Card className="p-5">
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="api-key" className="mb-1.5 block text-sm font-medium">
              API key
            </label>
            <div className="relative">
              <KeyRound aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-secondary" />
              <Input
                id="api-key"
                type="password"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                aria-invalid={Boolean(message) && !isUnreachable}
                aria-describedby={message ? 'login-message' : undefined}
                className="pl-9"
              />
            </div>

            {message && (
              <p id="login-message" role="alert" className="mt-2 text-sm text-danger-text">
                {message}
              </p>
            )}

            <Button type="submit" className="mt-4 w-full" disabled={!apiKey.trim() || isSubmitting}>
              {isSubmitting ? <Spinner className="text-on-accent" /> : null}
              {isSubmitting ? 'Checking…' : 'Unlock'}
            </Button>
          </form>

          {isUnreachable && (
            <Button variant="secondary" className="mt-2 w-full" onClick={() => void retryStoredKey()}>
              <RotateCw aria-hidden />
              Retry with saved key
            </Button>
          )}
        </Card>
      </div>
    </main>
  )
}
