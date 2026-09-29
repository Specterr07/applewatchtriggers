import { useQuery } from '@tanstack/react-query'

import { QUERY_KEYS } from '@/api/queryClient'
import { getStatus } from '@/api/tasks'

// GET /status: whether the API answers, and what the next /toggle press
// (from the Watch or anywhere else) will do. No polling - it's re-checked
// every time a screen showing it opens, on window focus, and after the app
// itself starts or stops a task.
export function useStatus() {
  return useQuery({ queryKey: QUERY_KEYS.status, queryFn: getStatus, refetchOnMount: 'always' })
}
