import { useMutation, useQueryClient } from '@tanstack/react-query'

import { updateNoteMutationOptions } from '@/hooks/useNotes'

// Updates a note's title and/or content, then refetches the notes list.
export function useUpdateNote() {
  const queryClient = useQueryClient()
  return useMutation(updateNoteMutationOptions(queryClient))
}
