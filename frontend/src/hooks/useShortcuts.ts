// Desktop keyboard shortcuts, V1 set (spec §6.2). Keys only ever come from
// a physical keyboard, so phones are unaffected. Esc isn't handled here:
// every sheet, drawer and dialog already closes on Esc by itself.

import { useEffect, useRef } from 'react'

export type ShortcutAction =
  | { type: 'capture' }
  | { type: 'start-stop' }
  | { type: 'focus-search' }
  | { type: 'show-help' }
  | { type: 'go'; path: string }

// Second key after "G", and where it goes.
export const GO_TARGETS: Record<string, string> = { h: '/', t: '/tasks', l: '/time-log', n: '/notes' }

// How long "G" waits for its second key.
export const GO_SEQUENCE_TIMEOUT_MS = 1500

type KeyInput = { key: string; shiftKey: boolean }

// Decides what a key press means. `awaitingGo` is true when the previous
// key was "G". Returns the action (if any) and whether to keep waiting for
// a "G" sequence's second key.
export function resolveShortcut({ key, shiftKey }: KeyInput, awaitingGo: boolean): {
  action: ShortcutAction | null
  awaitingGo: boolean
} {
  // "?" and "/" need Shift on some keyboard layouts, so Shift is allowed for them.
  if (key === '?') return { action: { type: 'show-help' }, awaitingGo: false }
  if (key === '/' && !awaitingGo) return { action: { type: 'focus-search' }, awaitingGo: false }
  // Letter shortcuts are plain lowercase keys; Shift+letter is left alone.
  if (shiftKey) return { action: null, awaitingGo: false }

  const letter = key.toLowerCase()
  if (awaitingGo) {
    const path = GO_TARGETS[letter]
    return { action: path ? { type: 'go', path } : null, awaitingGo: false }
  }
  switch (letter) {
    case 'g':
      return { action: null, awaitingGo: true }
    case 'c':
      return { action: { type: 'capture' }, awaitingGo: false }
    case 's':
      return { action: { type: 'start-stop' }, awaitingGo: false }
    default:
      return { action: null, awaitingGo: false }
  }
}

// True while the user is typing, or working inside an open sheet / drawer /
// dialog - shortcuts must never steal those key presses.
export function shouldIgnoreKeyTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target.closest('input, textarea, select, [role="dialog"]')) return true
  // Focus can sit on <body> while a modal is open (e.g. after clicking its backdrop).
  return document.querySelector('[role="dialog"]') !== null
}

// Listens for shortcut keys while `enabled`, calling `onAction` for each one.
export function useShortcuts(enabled: boolean, onAction: (action: ShortcutAction) => void): void {
  // The latest callback, so the listener doesn't need re-adding on every render.
  const onActionRef = useRef(onAction)
  useEffect(() => {
    onActionRef.current = onAction
  })

  useEffect(() => {
    if (!enabled) return
    let awaitingGo = false
    let goTimer: ReturnType<typeof setTimeout> | undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      if (shouldIgnoreKeyTarget(event.target)) return

      const result = resolveShortcut(event, awaitingGo)
      clearTimeout(goTimer)
      awaitingGo = result.awaitingGo
      if (awaitingGo) goTimer = setTimeout(() => (awaitingGo = false), GO_SEQUENCE_TIMEOUT_MS)

      if (result.action) {
        // Stops "/" from typing into the search box it's about to focus, and
        // the browser's own "/" quick-find in Firefox.
        event.preventDefault()
        onActionRef.current(result.action)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(goTimer)
    }
  }, [enabled])
}
