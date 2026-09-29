import { describe, expect, it } from 'vitest'

import { resolveShortcut } from '@/hooks/useShortcuts'

const press = (key: string, awaitingGo = false, shiftKey = false) => resolveShortcut({ key, shiftKey }, awaitingGo)

describe('resolveShortcut (spec §6.2 V1 set)', () => {
  it('maps single keys', () => {
    expect(press('c').action).toEqual({ type: 'capture' })
    expect(press('s').action).toEqual({ type: 'start-stop' })
    expect(press('/').action).toEqual({ type: 'focus-search' })
    expect(press('?', false, true).action).toEqual({ type: 'show-help' })
  })

  it('treats caps-lock letters like lowercase', () => {
    expect(press('C').action).toEqual({ type: 'capture' })
  })

  it('ignores Shift+letter', () => {
    expect(press('C', false, true).action).toBeNull()
  })

  it('handles the G-then-key sequences', () => {
    const first = press('g')
    expect(first).toEqual({ action: null, awaitingGo: true })
    expect(press('h', true).action).toEqual({ type: 'go', path: '/' })
    expect(press('t', true).action).toEqual({ type: 'go', path: '/tasks' })
    expect(press('l', true).action).toEqual({ type: 'go', path: '/time-log' })
    expect(press('n', true).action).toEqual({ type: 'go', path: '/notes' })
  })

  it('cancels a G sequence on any other key, without triggering that key', () => {
    expect(press('c', true)).toEqual({ action: null, awaitingGo: false })
    expect(press('x', true)).toEqual({ action: null, awaitingGo: false })
  })

  it('ignores unrelated keys', () => {
    expect(press('x')).toEqual({ action: null, awaitingGo: false })
    expect(press('Enter')).toEqual({ action: null, awaitingGo: false })
  })
})
