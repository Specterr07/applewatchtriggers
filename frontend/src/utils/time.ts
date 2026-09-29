// Time handling for the backend's timezone-less timestamps (spec §8.4).
//
// The server stores "YYYY-MM-DD HH:MM:SS" as wall-clock time in
// SERVER_TIMEZONE, with no offset. Passing that string to `new Date()` would
// silently treat it as the *browser's* local time and shift it for anyone
// not in that zone. So timestamps are split into numbers by hand, "now" is
// read in SERVER_TIMEZONE via Intl, and differences are taken with Date.UTC()
// on both sides - which keeps the browser's own timezone out of the maths.

import { SERVER_TIMEZONE } from '@/config'

// A date + time as plain numbers, in the server's timezone.
export type WallClock = {
  year: number
  month: number // 1-12
  day: number
  hour: number // 0-23
  minute: number
  second: number
}

const SERVER_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/

// Splits "2026-09-30 09:05:00" into numbers. Throws on anything else, since
// a malformed timestamp means the API contract changed - better to fail
// loudly than to show a wrong time.
export function parseServerTimestamp(value: string): WallClock {
  const match = SERVER_TIMESTAMP.exec(value)
  if (!match) throw new Error(`Unexpected server timestamp format: "${value}"`)
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number)
  return { year, month, day, hour, minute, second }
}

// The current wall-clock time in SERVER_TIMEZONE. `at` is only for tests.
export function serverNow(at: Date = new Date()): WallClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SERVER_TIMEZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at)
  const valueOf = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  return {
    year: valueOf('year'),
    month: valueOf('month'),
    day: valueOf('day'),
    hour: valueOf('hour'),
    minute: valueOf('minute'),
    second: valueOf('second'),
  }
}

// Milliseconds on a "pretend UTC" timeline. Only meaningful for comparing
// or subtracting two WallClocks from the same timezone.
function toComparableMs(clock: WallClock): number {
  return Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour, clock.minute, clock.second)
}

// Whole seconds from a server timestamp until `now`. Never negative (the
// browser clock can be slightly behind the server's).
export function secondsSince(serverTimestamp: string, now: WallClock): number {
  const elapsedMs = toComparableMs(now) - toComparableMs(parseServerTimestamp(serverTimestamp))
  return Math.max(0, Math.floor(elapsedMs / 1000))
}

// "YYYY-MM-DD" for a WallClock - the same format as a task's `date` field.
export function toDateKey(clock: WallClock): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${clock.year}-${pad(clock.month)}-${pad(clock.day)}`
}

// Whole calendar days from `earlier` to `later` (0 = same day, 1 = yesterday...).
function daysBetween(earlier: WallClock, later: WallClock): number {
  const dayStart = (clock: WallClock) => Date.UTC(clock.year, clock.month - 1, clock.day)
  return Math.round((dayStart(later) - dayStart(earlier)) / 86_400_000)
}

// Formats a WallClock with Intl *as if it were UTC*: the numbers go in via
// Date.UTC and come out unchanged, so no timezone shift can happen.
function formatWallClock(clock: WallClock, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(toComparableMs(clock))
}

// "9:05 AM" (or "09:05", depending on the browser's locale).
export function formatClockTime(serverTimestamp: string): string {
  return formatWallClock(parseServerTimestamp(serverTimestamp), { hour: 'numeric', minute: '2-digit' })
}

// "Wednesday, 30 September" (word order follows the browser's locale).
export function formatLongDate(clock: WallClock): string {
  return formatWallClock(clock, { weekday: 'long', day: 'numeric', month: 'long' })
}

// Short, relative-ish label for an event time: "9:05 AM", "Yesterday, 9:05 AM", or "Mon 28 Sep".
export function formatEventTime(serverTimestamp: string, now: WallClock): string {
  const clock = parseServerTimestamp(serverTimestamp)
  const dayGap = daysBetween(clock, now)
  const time = formatClockTime(serverTimestamp)
  if (dayGap <= 0) return time
  if (dayGap === 1) return `Yesterday, ${time}`
  return formatWallClock(clock, { weekday: 'short', day: 'numeric', month: 'short' })
}

// "Today", "Yesterday", or "Mon, 28 Sep" for a "YYYY-MM-DD" date key.
export function formatDayHeading(dateKey: string, now: WallClock): string {
  const clock = parseServerTimestamp(`${dateKey} 00:00:00`)
  const dayGap = daysBetween(clock, now)
  if (dayGap === 0) return 'Today'
  if (dayGap === 1) return 'Yesterday'
  return formatWallClock(clock, { weekday: 'short', day: 'numeric', month: 'short' })
}

// True when formatDayHeading() gives a relative word ("Today"/"Yesterday")
// that's worth pairing with the actual date.
export function isRelativeDay(dateKey: string, now: WallClock): boolean {
  return daysBetween(parseServerTimestamp(`${dateKey} 00:00:00`), now) <= 1
}

// "30 Sep" for a "YYYY-MM-DD" date key (compact table cells).
export function formatShortDate(dateKey: string): string {
  return formatWallClock(parseServerTimestamp(`${dateKey} 00:00:00`), { day: 'numeric', month: 'short' })
}

// The date key `days` away from `dateKey` (negative = earlier). Built with
// Date.UTC from numbers, so month/year rollover is handled without any
// timezone involvement.
export function shiftDateKey(dateKey: string, days: number): string {
  const clock = parseServerTimestamp(`${dateKey} 00:00:00`)
  const shifted = new Date(Date.UTC(clock.year, clock.month - 1, clock.day + days))
  return toDateKey({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: 0,
    minute: 0,
    second: 0,
  })
}

// Server timestamp -> the value an <input type="datetime-local"> expects
// ("2026-09-30 09:05:00" -> "2026-09-30T09:05:00").
export function toDatetimeLocal(serverTimestamp: string): string {
  return serverTimestamp.replace(' ', 'T')
}

// datetime-local value -> server timestamp. Some browsers' pickers drop the
// seconds even with step="1"; those get ":00" so the backend accepts them.
export function toServerTimestamp(datetimeLocal: string): string {
  const withSpace = datetimeLocal.replace('T', ' ')
  return withSpace.length === 16 ? `${withSpace}:00` : withSpace
}

// True if the string is exactly the backend's "YYYY-MM-DD HH:MM:SS" format.
export function isServerTimestamp(value: string): boolean {
  return SERVER_TIMESTAMP.test(value)
}

// "Good morning / afternoon / evening" for an hour 0-23.
export function greetingFor(hour: number): string {
  if (hour < 5) return 'Good evening'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// A duration in minutes (the backend's float) as "42m" or "2h 05m".
export function formatDuration(minutes: number): string {
  const totalMinutes = Math.floor(minutes)
  if (totalMinutes < 1) return '<1m'
  if (totalMinutes < 60) return `${totalMinutes}m`
  const hours = Math.floor(totalMinutes / 60)
  const remainder = String(totalMinutes % 60).padStart(2, '0')
  return `${hours}h ${remainder}m`
}

// A live timer: seconds as "0:04:09" / "1:02:03".
export function formatTimer(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}
