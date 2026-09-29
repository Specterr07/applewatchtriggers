import { useMutation } from '@tanstack/react-query'
import { Info, Link2, Mic, Send } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import { createTelegramLink, sendTestMessage } from '@/api/channels'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { ConnectSheet, type PendingLink } from '@/features/telegram/ConnectSheet'
import { formatLastTest, readLastTestAt, saveLastTestAt } from '@/features/telegram/telegramStatus'
import { useNow } from '@/hooks/useNow'

// Telegram (spec §4.8): connect a chat and send a test message - the only
// two things the backend offers. It can't report whether a chat is linked,
// so the page says that plainly instead of showing a made-up status.
export function TelegramPage() {
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null)
  const [lastTestAt, setLastTestAt] = useState(readLastTestAt)
  const now = useNow(30_000)

  const connect = useMutation({
    mutationFn: createTelegramLink,
    onSuccess: (link) => setPendingLink({ ...link, expiresAt: Date.now() + link.expires_in_minutes * 60_000 }),
  })

  const sendTest = useMutation({
    mutationFn: sendTestMessage,
    onSuccess: () => {
      const at = Date.now()
      saveLastTestAt(at)
      setLastTestAt(at)
      toast.success('Sent: check Telegram')
    },
  })

  return (
    <Page title="Telegram" description="Send voice notes to Sheev from Telegram.">
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <Section id="telegram-status-heading" title="Status">
            <Card className="flex items-start gap-3 p-4">
              <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" />
              <div>
                <p>Sheev can’t check link status yet. Send a test message to confirm.</p>
                <p className="mt-1 text-sm text-secondary">
                  {lastTestAt ? (
                    <>
                      Last successful test: <span className="tabular-nums">{formatLastTest(lastTestAt, now)}</span>
                    </>
                  ) : (
                    'No successful test from this browser yet.'
                  )}
                </p>
              </div>
            </Card>
          </Section>

          <Section id="telegram-connect-heading" title="Connect">
            <Card className="p-4">
              <p className="text-secondary">
                Creates a one-time link that pairs your Telegram chat with Sheev. It works for 10 minutes.
              </p>
              <Button onClick={() => connect.mutate()} disabled={connect.isPending} className="mt-4 w-full sm:w-auto">
                {connect.isPending ? <Spinner className="text-on-accent" /> : <Link2 aria-hidden />}
                Connect Telegram
              </Button>
              <ActionError error={connect.error} />
            </Card>
          </Section>

          <Section id="telegram-test-heading" title="Send a test message">
            <Card className="p-4">
              <p className="text-secondary">Sheev’s bot sends “Test” to the linked chat.</p>
              <Button
                variant="secondary"
                onClick={() => sendTest.mutate()}
                disabled={sendTest.isPending}
                className="mt-4 w-full sm:w-auto"
              >
                {sendTest.isPending ? <Spinner /> : <Send aria-hidden />}
                Send test message
              </Button>
              <ActionError error={sendTest.error} />
            </Card>
          </Section>
        </div>

        <div className="min-w-0">
          <Section id="telegram-how-heading" title="How it works">
            <Card className="flex items-start gap-3 p-4">
              <Mic aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" />
              <p className="text-secondary">
                Once connected, send a voice note to Sheev’s bot. It’s transcribed and saved like a note recorded here, and
                shows up in Notes.
              </p>
            </Card>
          </Section>
        </div>
      </div>

      <ConnectSheet
        link={pendingLink}
        onOpenChange={(open) => !open && setPendingLink(null)}
        onRequestNewLink={() => connect.mutate()}
        isRequestingNewLink={connect.isPending}
      />
    </Page>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-3 text-md font-semibold">
        {title}
      </h2>
      {children}
    </section>
  )
}

// The server's own message for a failed action. A 401 isn't shown: it has
// already signed the user out, and the login screen explains why.
function ActionError({ error }: { error: Error | null }) {
  if (!error || (error instanceof ApiError && error.status === 401)) return null
  return (
    <p role="alert" className="mt-3 text-sm text-danger-text">
      {error.message}
    </p>
  )
}
