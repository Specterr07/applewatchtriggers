import { useEffect, useState } from 'react'

import { serverNow, type WallClock } from '@/utils/time'

// The current time in the server's timezone, re-read every `intervalMs`.
// This is what drives the live timer: it only re-renders the component,
// it never calls the API (spec §8.5).
export function useNow(intervalMs: number): WallClock {
  const [now, setNow] = useState(serverNow)

  useEffect(() => {
    // Refresh immediately too, so switching from a slow interval to a fast
    // one (a task just started) doesn't show a stale value for a moment.
    setNow(serverNow())
    const timerId = setInterval(() => setNow(serverNow()), intervalMs)
    return () => clearInterval(timerId)
  }, [intervalMs])

  return now
}
