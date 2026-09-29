import { useQuery, type QueryClient } from '@tanstack/react-query'

import { deleteNote, listNotes } from '@/api/notes'
import { QUERY_KEYS } from '@/api/queryClient'
import { AUDIO_URL_MAX_AGE_MS } from '@/features/notes/audioRecovery'

// All voice notes (newest first), cached and shared by every screen.
// Playback links expire after an hour, so while a page using notes stays
// open and visible, the list (and its links) is refreshed every 50 minutes.
export function useNotes() {
  return useQuery({ queryKey: QUERY_KEYS.notes, queryFn: listNotes, refetchInterval: AUDIO_URL_MAX_AGE_MS })
}

// Delete-a-note mutation settings, kept outside the hook so tests can run
// the real mutation without React. No optimistic removal: the note leaves
// the list only once the server has confirmed the delete and the list is
// refetched, so a failed delete can never look like it worked.
export function deleteNoteMutationOptions(queryClient: QueryClient) {
  return {
    mutationFn: (noteId: number) => deleteNote(noteId),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes }),
  }
}
