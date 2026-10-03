import { useMutation, useQueryClient } from '@tanstack/react-query'

import { renameNoteMutationOptions } from '@/hooks/useNotes'

// Renames a note, then refetches the notes list (Home and Notes update).
export function useRenameNote() {
  const queryClient = useQueryClient()
  return useMutation(renameNoteMutationOptions(queryClient))
}
