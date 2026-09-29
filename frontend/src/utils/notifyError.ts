import { toast } from 'sonner'

import { ApiError } from '@/api/client'

// Shows a failed action as an error toast. A 401 is skipped: it has already
// signed the user out, and the login screen explains why.
export function notifyError(error: unknown): void {
  if (error instanceof ApiError && error.status === 401) return
  toast.error(error instanceof Error ? error.message : String(error))
}
