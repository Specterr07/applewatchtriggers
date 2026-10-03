import { MutationObserver, QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/client'
import { deleteNote } from '@/api/notes'
import { QUERY_KEYS } from '@/api/queryClient'
import { deleteNoteMutationOptions } from '@/hooks/useNotes'
import type { Note } from '@/types/note'

vi.mock('@/api/notes', () => ({ deleteNote: vi.fn(), listNotes: vi.fn() }))

const NOTES: Note[] = [{ id: 1, title: null, transcript: 'Keep me', audio_url: null, created_at: '2026-09-30 09:00:00' }]

// Runs the real delete mutation (as useDeleteNote would) against a cache
// that already holds the notes list.
async function runDelete(noteId: number) {
  const queryClient = new QueryClient()
  queryClient.setQueryData(QUERY_KEYS.notes, NOTES)
  const observer = new MutationObserver(queryClient, deleteNoteMutationOptions(queryClient))
  const outcome = await observer.mutate(noteId).then(
    () => 'deleted',
    (err: unknown) => err,
  )
  return { queryClient, outcome }
}

describe('delete note mutation', () => {
  it('refetches the notes list once the server confirms', async () => {
    vi.mocked(deleteNote).mockResolvedValueOnce()
    const { queryClient, outcome } = await runDelete(1)
    expect(outcome).toBe('deleted')
    expect(deleteNote).toHaveBeenCalledWith(1)
    expect(queryClient.getQueryState(QUERY_KEYS.notes)?.isInvalidated).toBe(true)
  })

  it('surfaces a server failure and never removes the note from the cache', async () => {
    vi.mocked(deleteNote).mockRejectedValueOnce(new ApiError('No note with that id', 404))
    const { queryClient, outcome } = await runDelete(1)
    expect(outcome).toBeInstanceOf(ApiError)
    expect((outcome as ApiError).message).toBe('No note with that id')
    expect(queryClient.getQueryData(QUERY_KEYS.notes)).toEqual(NOTES)
  })
})
