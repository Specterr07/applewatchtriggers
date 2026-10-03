import { describe, expect, it, vi } from 'vitest'

import { AUDIO_URL_MAX_AGE_MS, isAudioUrlStale, recoverPlayback } from '@/features/notes/audioRecovery'
import { filterNotes, getNotesViewState, getNoteTitle, groupNotesByDay, hasRealTitle } from '@/features/notes/noteText'
import type { Note } from '@/types/note'

function note(id: number, transcript: string, title: string | null = null, created_at = '2026-09-30 09:00:00'): Note {
  return { id, title, transcript, audio_url: `https://audio/${id}?sig=a`, created_at }
}

const NOTES = [note(3, 'Call the bank about the card'), note(2, 'Grocery list:\nmilk, eggs'), note(1, 'Idea for the BANK app')]

describe('note text', () => {
  it('uses the AI title when there is one', () => {
    expect(getNoteTitle({ title: 'Weekend groceries', transcript: 'milk, eggs' })).toBe('Weekend groceries')
    expect(hasRealTitle({ title: 'Weekend groceries', transcript: '' })).toBe(true)
  })

  it('falls back to the first transcript line when there is no title', () => {
    expect(getNoteTitle({ title: null, transcript: 'Grocery list:\nmilk, eggs' })).toBe('Grocery list:')
    expect(getNoteTitle({ title: '  ', transcript: 'Grocery list' })).toBe('Grocery list')
    expect(getNoteTitle({ title: null, transcript: '   ' })).toBe('Voice note')
    expect(getNoteTitle({ title: null, transcript: 'x'.repeat(100) })).toHaveLength(80)
    expect(hasRealTitle({ title: null, transcript: 'x' })).toBe(false)
  })

  it('searches transcripts case-insensitively, keeping newest first', () => {
    expect(filterNotes(NOTES, 'bank').map((n) => n.id)).toEqual([3, 1])
    expect(filterNotes(NOTES, 'EGGS').map((n) => n.id)).toEqual([2])
    expect(filterNotes(NOTES, '  ')).toBe(NOTES)
  })

  it('searches titles too', () => {
    const titled = [note(5, 'we need to sort out the flat', 'Rent agreement renewal'), ...NOTES]
    expect(filterNotes(titled, 'rent').map((n) => n.id)).toEqual([5])
  })

  it('groups newest-first notes by day, keeping the order', () => {
    const now = { year: 2026, month: 10, day: 3, hour: 12, minute: 0, second: 0 }
    const notes = [
      note(4, 'd', null, '2026-10-03 11:00:00'),
      note(3, 'c', null, '2026-10-03 08:00:00'),
      note(2, 'b', null, '2026-10-02 20:00:00'),
      note(1, 'a', null, '2026-09-28 09:00:00'),
    ]
    const groups = groupNotesByDay(notes, now)
    expect(groups.map((g) => g.heading.split(',')[0])).toEqual(['Today', 'Yesterday', expect.any(String)])
    expect(groups.map((g) => g.notes.map((n) => n.id))).toEqual([[4, 3], [2], [1]])
    expect(groupNotesByDay([], now)).toEqual([])
  })
})

describe('notes view state', () => {
  const base = { isPending: false, isError: false }
  it('covers loading, error, empty, no matches and list', () => {
    expect(getNotesViewState({ ...base, isPending: true, notes: undefined, matches: [] })).toBe('loading')
    expect(getNotesViewState({ ...base, isError: true, notes: undefined, matches: [] })).toBe('error')
    expect(getNotesViewState({ ...base, notes: [], matches: [] })).toBe('empty')
    expect(getNotesViewState({ ...base, notes: NOTES, matches: [] })).toBe('no-matches')
    expect(getNotesViewState({ ...base, notes: NOTES, matches: NOTES })).toBe('list')
  })

  it('keeps showing earlier notes when a background refresh fails', () => {
    expect(getNotesViewState({ ...base, isError: true, notes: NOTES, matches: NOTES })).toBe('list')
  })
})

describe('audio playback recovery', () => {
  it('treats links older than 50 minutes as stale', () => {
    expect(isAudioUrlStale(0, AUDIO_URL_MAX_AGE_MS - 1)).toBe(false)
    expect(isAudioUrlStale(0, AUDIO_URL_MAX_AGE_MS)).toBe(true)
  })

  it('retries once with a fresh link when the old one has expired', async () => {
    const refreshUrl = vi.fn(async () => 'https://audio/3?sig=b')
    await expect(recoverPlayback({ failedUrl: 'https://audio/3?sig=a', alreadyRetried: false, refreshUrl })).resolves.toEqual({
      kind: 'retry',
      url: 'https://audio/3?sig=b',
    })
    expect(refreshUrl).toHaveBeenCalledTimes(1)
  })

  it('gives up after one retry instead of looping', async () => {
    const refreshUrl = vi.fn(async () => 'https://audio/3?sig=c')
    const result = await recoverPlayback({ failedUrl: 'https://audio/3?sig=b', alreadyRetried: true, refreshUrl })
    expect(result.kind).toBe('failed')
    expect(refreshUrl).not.toHaveBeenCalled()
  })

  it('reports a failed refresh, a missing link, or an unchanged link as a real failure', async () => {
    const failing = await recoverPlayback({ failedUrl: 'u', alreadyRetried: false, refreshUrl: async () => Promise.reject(new Error('offline')) })
    const missing = await recoverPlayback({ failedUrl: 'u', alreadyRetried: false, refreshUrl: async () => null })
    const unchanged = await recoverPlayback({ failedUrl: 'u', alreadyRetried: false, refreshUrl: async () => 'u' })
    expect([failing.kind, missing.kind, unchanged.kind]).toEqual(['failed', 'failed', 'failed'])
  })
})
