// The Apple Watch Shortcut's URL and the labels around it (spec §4.9), as
// plain functions so they can be tested without rendering anything.

import type { ToggleAction } from '@/types/task'

// Shown in place of the key until the user taps Reveal.
export const MASKED_KEY = '••••••'

// The exact URL the Shortcut's "Get Contents of URL" action calls. Built
// from the address this page was loaded from, so it's right on any host.
export function buildShortcutUrl(origin: string, apiKey: string | null, { reveal }: { reveal: boolean }): string {
  const key = reveal ? encodeURIComponent(apiKey ?? '') : MASKED_KEY
  return `${origin}/toggle?key=${key}`
}

// /status says "End"; people say "Stop".
export function nextPressLabel(action: ToggleAction): 'Start' | 'Stop' {
  return action === 'End' ? 'Stop' : 'Start'
}
