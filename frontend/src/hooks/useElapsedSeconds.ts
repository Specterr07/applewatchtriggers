import { useEffect, useState } from 'react'

// Whole seconds since `startedAt` (a performance.now() value), updated
// twice a second so the display never skips a second. Purely local timing -
// no server involved. Returns 0 when nothing has started.
export function useElapsedSeconds(startedAt: number | null): number {
  const [now, setNow] = useState(() => performance.now())

  useEffect(() => {
    if (startedAt === null) return
    setNow(performance.now())
    const timerId = setInterval(() => setNow(performance.now()), 500)
    return () => clearInterval(timerId)
  }, [startedAt])

  return startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000))
}

// "0:07", "12:45", "1:02:03" - a recording's length.
export function formatRecordingTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`
}
