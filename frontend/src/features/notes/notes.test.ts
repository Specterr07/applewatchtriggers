import { describe, expect, it, vi } from 'vitest'

import { AUDIO_URL_MAX_AGE_MS, isAudioUrlStale, recoverPlayback } from '@/features/notes/audioRecovery'
import { filterNotes, getNotesViewState, getNoteTitle } from '@/features/notes/noteText'
import type { Note } from '@/types/note'

function note(id: number, transcript: string): Note {
  return { id, transcript, audio_url: `https://audio/${id}?sig=a`, created_at: '2026-09-30 09:00:00' }
}

const NOTES = [note(3, 'Call the bank about the card'), note(2, 'Grocery list:\nmilk, eggs'), note(1, 'Idea for the BANK app')]

describe('note text', () => {
  it('uses the first transcript line as the title', () => {
    expect(getNoteTitle('Grocery list:\nmilk, eggs')).toBe('Grocery list:')
    expect(getNoteTitle('   ')).toBe('Voice note')
    expect(getNoteTitle('x'.repeat(100))).toHaveLength(80)
  })

  it('searches transcripts case-insensitively, keeping newest first', () => {
    expect(filterNotes(NOTES, 'bank').map((n) => n.id)).toEqual([3, 1])
    expect(filterNotes(NOTES, 'EGGS').map((n) => n.id)).toEqual([2])
    expect(filterNotes(NOTES, '  ')).toBe(NOTES)
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
