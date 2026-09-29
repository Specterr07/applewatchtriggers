// Browser-side Telegram state (spec §4.8). The server can't say whether a
// chat is linked, so the only honest signal is "the last test message this
// browser sent went through" - remembered locally.

import { TELEGRAM_LAST_TEST_STORAGE } from '@/config'
import { readStorage, writeStorage } from '@/utils/storage'
import { formatEventTime, serverNow, toServerTimestampString, type WallClock } from '@/utils/time'

// When a test message last succeeded (Date.now() ms), or null if never / unreadable.
export function readLastTestAt(): number | null {
  const stored = Number(readStorage(TELEGRAM_LAST_TEST_STORAGE))
  return Number.isFinite(stored) && stored > 0 ? stored : null
}

export function saveLastTestAt(at: number): void {
  writeStorage(TELEGRAM_LAST_TEST_STORAGE, String(at))
}

// "9:05 PM", "Yesterday, 9:05 PM" or "Mon 28 Sep", in server time like every other time in the app.
export function formatLastTest(at: number, now: WallClock): string {
  return formatEventTime(toServerTimestampString(serverNow(new Date(at))), now)
}

// Whole seconds left before a link code expires, never negative.
export function secondsUntil(expiresAt: number, nowMs: number): number {
  return Math.max(0, Math.ceil((expiresAt - nowMs) / 1000))
}

// "9:05" (minutes:seconds) for the link countdown.
export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`
}
