import { Check, Copy, Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { buildShortcutUrl } from '@/features/watch/shortcut'
import { getStoredApiKey } from '@/utils/session'

// How long the Copy button shows its "Copied" tick.
const COPIED_FEEDBACK_MS = 2000

// The URL to paste into the Shortcut. The key stays hidden until Reveal is
// tapped; Copy always copies the real URL (that's the point of copying it).
export function ShortcutSetup() {
  const [isRevealed, setIsRevealed] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const apiKey = getStoredApiKey()
  const origin = window.location.origin

  useEffect(() => {
    if (!isCopied) return
    const timerId = setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS)
    return () => clearTimeout(timerId)
  }, [isCopied])

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(buildShortcutUrl(origin, apiKey, { reveal: true }))
      setIsCopied(true)
      toast.success('Shortcut URL copied')
    } catch {
      // Clipboard access can be refused (permissions, non-secure page).
      setIsRevealed(true)
      toast.error('Couldn’t copy - the URL is now shown, select and copy it instead.')
    }
  }

  return (
    <section aria-labelledby="shortcut-setup-heading">
      <h2 id="shortcut-setup-heading" className="text-md font-semibold">
        Setup
      </h2>
      <p className="mt-0.5 text-secondary-on-bg">
        Use this URL in the Shortcut’s “Get Contents of URL” action, with the method set to GET.
      </p>
      <Card className="mt-3 p-4">
        <label htmlFor="shortcut-url" className="text-sm text-secondary">
          Shortcut URL
        </label>
        <output
          id="shortcut-url"
          className="mt-1 block rounded-control bg-surface-muted px-3 py-2.5 font-mono text-sm break-all"
        >
          {buildShortcutUrl(origin, apiKey, { reveal: isRevealed })}
        </output>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" aria-pressed={isRevealed} onClick={() => setIsRevealed((shown) => !shown)}>
            {isRevealed ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            {isRevealed ? 'Hide key' : 'Reveal key'}
          </Button>
          <Button variant="secondary" onClick={() => void copyUrl()}>
            {isCopied ? <Check aria-hidden className="text-success-strong" /> : <Copy aria-hidden />}
            {isCopied ? 'Copied' : 'Copy URL'}
          </Button>
        </div>

        <p className="mt-3 text-sm text-secondary">
          The URL contains your API key: anyone who has it can start and stop your tasks.
        </p>
      </Card>
    </section>
  )
}
