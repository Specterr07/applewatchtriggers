import { ExternalLink, RotateCw, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button, buttonVariants } from '@/components/ui/Button'
import { ResponsiveDialog } from '@/components/ui/ResponsiveDialog'
import { Spinner } from '@/components/ui/Spinner'
import { formatCountdown, secondsUntil } from '@/features/telegram/telegramStatus'
import type { TelegramLinkResponse } from '@/types/channel'

// A link code plus the browser-clock moment it stops working.
export type PendingLink = TelegramLinkResponse & { expiresAt: number }

type ConnectSheetProps = {
  link: PendingLink | null
  onOpenChange: (open: boolean) => void
  // Asks the server for a fresh code (after the old one expired).
  onRequestNewLink: () => void
  isRequestingNewLink: boolean
}

// Shows a freshly created Telegram link (spec §4.8): an "Open in Telegram"
// button with a 10-minute countdown, or - when the server has no bot
// username configured - the raw code and why there's no link.
export function ConnectSheet({ link, onOpenChange, onRequestNewLink, isRequestingNewLink }: ConnectSheetProps) {
  const secondsLeft = useSecondsLeft(link?.expiresAt ?? null)
  const isExpired = link !== null && secondsLeft === 0

  return (
    <ResponsiveDialog
      open={link !== null}
      onOpenChange={onOpenChange}
      title="Connect Telegram"
      description={
        link?.link_url
          ? 'Open Telegram and press Start in the chat with Sheev’s bot.'
          : 'A pairing code was created, but there’s no link to open.'
      }
    >
      {link && (
        <div className="flex flex-col gap-4">
          {isExpired ? (
            <div role="alert" className="flex flex-col gap-3">
              <p className="text-secondary">This code has expired. Get a new one to connect.</p>
              <Button onClick={onRequestNewLink} disabled={isRequestingNewLink} className="w-full">
                {isRequestingNewLink ? <Spinner className="text-on-accent" /> : <RotateCw aria-hidden />}
                Get a new link
              </Button>
            </div>
          ) : link.link_url ? (
            <>
              <a
                href={link.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ className: 'w-full' })}
              >
                Open in Telegram
                <ExternalLink aria-hidden />
              </a>
              <Countdown secondsLeft={secondsLeft} />
            </>
          ) : (
            <>
              <p className="flex items-start gap-2 rounded-control border border-border bg-surface-muted px-3 py-2 text-sm text-secondary-on-bg">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-danger-text" />
                Bot username isn’t configured on the server (TELEGRAM_BOT_USERNAME), so Sheev can’t build a Telegram link.
              </p>
              <div>
                <p className="text-sm text-secondary">Your pairing code</p>
                <p className="mt-1 rounded-control bg-surface-muted px-3 py-2.5 font-mono text-md break-all select-all">{link.code}</p>
              </div>
              <p className="text-sm text-secondary">
                To use it, send <code className="font-mono text-foreground">/start {link.code}</code> to your Sheev bot in Telegram.
              </p>
              <Countdown secondsLeft={secondsLeft} />
            </>
          )}

          <p className="border-t border-border pt-3 text-sm text-secondary">
            Once you’ve connected, send a test message to check it worked.
          </p>
        </div>
      )}
    </ResponsiveDialog>
  )
}

function Countdown({ secondsLeft }: { secondsLeft: number }) {
  return (
    <p className="text-center text-sm text-secondary">
      Expires in{' '}
      <span role="timer" aria-live="off" className="font-medium text-foreground tabular-nums">
        {formatCountdown(secondsLeft)}
      </span>
    </p>
  )
}

// Seconds until `expiresAt` (browser clock), ticking once a second.
function useSecondsLeft(expiresAt: number | null): number {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (expiresAt === null) return
    setNowMs(Date.now())
    const timerId = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timerId)
  }, [expiresAt])

  return expiresAt === null ? 0 : secondsUntil(expiresAt, nowMs)
}
