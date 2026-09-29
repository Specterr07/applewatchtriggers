// React Query setup for server data (spec §8.5). Local UI state stays in
// plain React state; this cache only holds what came from the API.

import { QueryClient } from '@tanstack/react-query'

import { ApiError } from '@/api/client'

// Cache keys, shared so every screen reading tasks uses the same cached list.
export const QUERY_KEYS = {
  tasks: ['tasks'] as const,
  notes: ['notes'] as const,
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The server runs a single worker, so avoid refetching data that was
      // loaded moments ago. Window focus / reconnect still refresh anything
      // older than this, and every change the app makes refetches straight away.
      staleTime: 15_000,
      // Retry once if the network dropped; never retry a real server answer
      // (4xx/5xx) - repeating it would just give the same error.
      retry: (failureCount, error) => error instanceof ApiError && error.status === 0 && failureCount < 1,
    },
  },
})
