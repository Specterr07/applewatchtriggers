import { useCallback, useRef, useState } from 'react'
import { Editor, Tldraw, getSnapshot, loadSnapshot, type TLEditorSnapshot } from 'tldraw'
import 'tldraw/tldraw.css'

// Same key the main page (static/index.html) stores the API key under -
// same origin, so localStorage is shared and we don't need our own login.
const API_KEY_STORAGE = 'task_logger_api_key'

// How long to wait after the last edit before saving. Long enough that
// a burst of quick strokes only triggers one save, short enough that
// closing the tab a few seconds after you stop drawing won't lose work.
const SAVE_DEBOUNCE_MS = 3000

function authHeaders(): Record<string, string> {
  const apiKey = localStorage.getItem(API_KEY_STORAGE)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers['X-API-Key'] = apiKey
  return headers
}

type LoadState = 'loading' | 'ready' | 'error'

// A single persistent canvas, now saved server-side (GET/PUT /api/canvas)
// instead of only in this browser's local storage - so the same drawing
// shows up whichever device you open it from. No multiplayer sync; this
// is still a single scratchpad, just no longer tied to one browser.
export default function App() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorRef = useRef<Editor | null>(null)

  const saveSnapshot = useCallback(async () => {
    const editor = editorRef.current
    if (!editor) return
    try {
      const snapshot = getSnapshot(editor.store)
      await fetch('/api/canvas', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ snapshot }),
      })
    } catch (err) {
      // A dropped connection mid-save isn't fatal here - the next edit
      // reschedules a save, so a brief network blip just delays it
      // rather than losing anything (nothing local was ever cleared).
      console.error('Could not save canvas:', err)
    }
  }, [])

  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(saveSnapshot, SAVE_DEBOUNCE_MS)
  }, [saveSnapshot])

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor

      // Load whatever was last saved, then start watching for edits.
      // An IIFE because onMount itself isn't async.
      ;(async () => {
        try {
          const res = await fetch('/api/canvas', { headers: authHeaders() })
          if (!res.ok) throw new Error(`Server returned ${res.status}`)
          const data = await res.json()
          if (!data.ok) throw new Error(data.message || 'Could not load canvas')
          if (data.snapshot) {
            loadSnapshot(editor.store, data.snapshot as TLEditorSnapshot)
          }
          setLoadState('ready')
        } catch (err) {
          // Couldn't reach the server or the saved snapshot was bad -
          // don't leave the canvas stuck on a spinner forever; let the
          // error banner offer a retry instead.
          console.error('Could not load canvas:', err)
          setLoadState('error')
        }
      })()

      // Only re-save on the local user's own document edits (shapes,
      // pages, etc.) - not on "session" changes like camera pan/zoom,
      // and not on changes this tab just loaded from the server itself.
      const unsubscribe = editor.store.listen(scheduleSave, {
        source: 'user',
        scope: 'document',
      })

      // Save immediately if the tab is about to go away, instead of
      // losing up to SAVE_DEBOUNCE_MS of edits to an unfired timer.
      const flushOnHide = () => {
        if (document.visibilityState === 'hidden') saveSnapshot()
      }
      document.addEventListener('visibilitychange', flushOnHide)

      return () => {
        unsubscribe()
        document.removeEventListener('visibilitychange', flushOnHide)
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      }
    },
    [scheduleSave, saveSnapshot],
  )

  const retryLoad = useCallback(() => {
    setLoadState('loading')
    // Re-running handleMount's load logic would need the editor instance
    // again - simplest correct fix is just reloading the page, which
    // re-runs onMount from scratch.
    window.location.reload()
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <a
        href="/"
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 1000,
          background: '#1a1d24',
          color: '#e8e9ec',
          border: '1px solid #2a2e38',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 13,
          fontFamily: 'sans-serif',
          textDecoration: 'none',
        }}
      >
        ← Back to Task Logger
      </a>

      {loadState === 'loading' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f1115',
            color: '#8b8f9a',
            fontFamily: 'sans-serif',
            fontSize: 14,
          }}
        >
          Loading canvas…
        </div>
      )}

      {loadState === 'error' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f1115',
            color: '#e8e9ec',
            fontFamily: 'sans-serif',
            fontSize: 14,
          }}
        >
          <div>Couldn't load your saved canvas.</div>
          <button
            onClick={retryLoad}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#5b8cff',
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      <Tldraw onMount={handleMount} />
    </div>
  )
}
