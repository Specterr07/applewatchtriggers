import { useMutation, useQueryClient } from '@tanstack/react-query'

import { deleteNoteMutationOptions } from '@/hooks/useNotes'

// Deletes a note, then refetches the notes list (Home and Notes update).
export function useDeleteNote() {
  const queryClient = useQueryClient()
  return useMutation(deleteNoteMutationOptions(queryClient))
}
