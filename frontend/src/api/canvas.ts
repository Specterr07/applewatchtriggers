// Canvas persistence: GET/PUT /api/canvas (a single saved snapshot).

import { apiFetch } from '@/api/client'
import type { CanvasResponse, SaveCanvasResponse } from '@/types/api'

// Loads the saved snapshot; `snapshot` is null for a canvas never saved.
export function getCanvas(): Promise<CanvasResponse> {
  return apiFetch<CanvasResponse>('/api/canvas')
}

// Overwrites the saved snapshot (last write wins - there's only one canvas).
export function saveCanvas(snapshot: unknown): Promise<SaveCanvasResponse> {
  return apiFetch<SaveCanvasResponse>('/api/canvas', { method: 'PUT', body: { snapshot } })
}
