// Response shapes for the endpoints the app uses so far.
// Source of truth: static/openapi.yaml (served at /docs).

// GET /api/canvas. `snapshot` is whatever tldraw's getSnapshot() produced;
// it's typed as unknown here so this file doesn't depend on tldraw.
export type CanvasResponse = {
  ok: true
  snapshot: unknown | null
  updated_at: string | null
}

// PUT /api/canvas
export type SaveCanvasResponse = {
  ok: true
  updated_at: string
}
