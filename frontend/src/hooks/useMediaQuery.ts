import { useCallback, useSyncExternalStore } from 'react'

// True while the CSS media query matches, and re-renders when that changes
// (window resized, phone rotated, OS switched to dark mode...).
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mediaList = window.matchMedia(query)
      mediaList.addEventListener('change', onChange)
      return () => mediaList.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}
