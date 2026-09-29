import { describe, expect, it } from 'vitest'

import {
  formatDuration,
  formatTimer,
  greetingFor,
  parseServerTimestamp,
  secondsSince,
  serverNow,
  toDateKey,
} from '@/utils/time'

describe('parseServerTimestamp', () => {
  it('splits a backend timestamp into numbers', () => {
    expect(parseServerTimestamp('2026-09-30 09:05:07')).toEqual({
      year: 2026, month: 9, day: 30, hour: 9, minute: 5, second: 7,
    })
  })

  it('rejects anything that is not the backend format', () => {
    expect(() => parseServerTimestamp('2026-09-30T09:05:07Z')).toThrow()
    expect(() => parseServerTimestamp('')).toThrow()
  })
})

describe('serverNow', () => {
  it('reads the wall clock in the server timezone (Asia/Kolkata, UTC+5:30), not the browser one', () => {
    // 20:00 UTC is 01:30 the next day in India.
    const now = serverNow(new Date(Date.UTC(2026, 8, 30, 20, 0, 0)))
    expect(now).toEqual({ year: 2026, month: 10, day: 1, hour: 1, minute: 30, second: 0 })
    expect(toDateKey(now)).toBe('2026-10-01')
  })

  it('never reports hour 24 at midnight', () => {
    expect(serverNow(new Date(Date.UTC(2026, 8, 30, 18, 30, 0))).hour).toBe(0)
  })
})

describe('secondsSince', () => {
  it('counts elapsed time across midnight', () => {
    const now = parseServerTimestamp('2026-10-01 00:10:00')
    expect(secondsSince('2026-09-30 23:50:00', now)).toBe(20 * 60)
  })

  it('never goes negative when the browser clock is behind the server', () => {
    const now = parseServerTimestamp('2026-09-30 09:00:00')
    expect(secondsSince('2026-09-30 09:00:05', now)).toBe(0)
  })
})

describe('formatting', () => {
  it('formats durations as the spec describes', () => {
    expect(formatDuration(0.4)).toBe('<1m')
    expect(formatDuration(42.5)).toBe('42m')
    expect(formatDuration(60)).toBe('1h 00m')
    expect(formatDuration(125)).toBe('2h 05m')
  })

  it('formats the live timer as H:MM:SS', () => {
    expect(formatTimer(0)).toBe('0:00:00')
    expect(formatTimer(249)).toBe('0:04:09')
    expect(formatTimer(3723)).toBe('1:02:03')
  })

  it('picks a greeting by hour', () => {
    expect(greetingFor(8)).toBe('Good morning')
    expect(greetingFor(14)).toBe('Good afternoon')
    expect(greetingFor(21)).toBe('Good evening')
    expect(greetingFor(2)).toBe('Good evening')
  })
})
