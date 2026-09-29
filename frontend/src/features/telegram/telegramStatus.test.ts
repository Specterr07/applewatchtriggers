import { beforeEach, describe, expect, it } from 'vitest'

import { TELEGRAM_LAST_TEST_STORAGE } from '@/config'
import { formatCountdown, formatLastTest, readLastTestAt, saveLastTestAt, secondsUntil } from '@/features/telegram/telegramStatus'
import { formatClockTime, serverNow } from '@/utils/time'

// Minimal in-memory localStorage (vitest runs in Node, which has none).
function installMemoryStorage() {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
      },
    },
  })
  return store
}

describe('last successful test time', () => {
  let store: Map<string, string>
  beforeEach(() => {
    store = installMemoryStorage()
  })

  it('is empty until a test succeeds', () => {
    expect(readLastTestAt()).toBeNull()
  })

  it('round-trips through localStorage', () => {
    saveLastTestAt(1_790_000_000_000)
    expect(store.get(TELEGRAM_LAST_TEST_STORAGE)).toBe('1790000000000')
    expect(readLastTestAt()).toBe(1_790_000_000_000)
  })

  it('ignores garbage', () => {
    store.set(TELEGRAM_LAST_TEST_STORAGE, 'not a number')
    expect(readLastTestAt()).toBeNull()
  })
})

describe('formatLastTest', () => {
  it('shows the moment in server time, like the rest of the app', () => {
    // 2026-09-30 03:30:00 UTC is 09:00:00 in Asia/Kolkata (the default SERVER_TIMEZONE).
    const at = Date.UTC(2026, 8, 30, 3, 30, 0)
    const now = serverNow(new Date(Date.UTC(2026, 8, 30, 4, 0, 0)))
    expect(formatLastTest(at, now)).toBe(formatClockTime('2026-09-30 09:00:00'))
  })
})

describe('link countdown', () => {
  it('counts whole seconds down to zero, never below', () => {
    expect(secondsUntil(10_000, 0)).toBe(10)
    expect(secondsUntil(10_000, 9_001)).toBe(1)
    expect(secondsUntil(10_000, 12_000)).toBe(0)
  })

  it('formats minutes:seconds', () => {
    expect(formatCountdown(600)).toBe('10:00')
    expect(formatCountdown(65)).toBe('1:05')
    expect(formatCountdown(0)).toBe('0:00')
  })
})
