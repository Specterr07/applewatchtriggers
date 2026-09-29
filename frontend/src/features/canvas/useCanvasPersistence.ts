// Loads the canvas from the server and saves it back after edits (spec §8.7).
//
// Same behaviour as the old frontend/App.tsx: load on mount, save 3s after
// the last edit (user document edits only, not camera moves), and save
// right away when the tab is hidden. Fixes over the old version:
//  - a failed save is reported (the old code never checked the response);
//  - nothing is saved until the load succeeded - before, hiding the tab
//    after a failed load could overwrite the saved canvas with a blank one;
//  - pending edits are saved when you navigate away inside the app.

import { useCallback, useRef, useState } from 'react'
import { getSnapshot, loadSnapshot, type Editor, type TLEditorSnapshot } from 'tldraw'

import { getCanvas, saveCanvas } from '@/api/canvas'

// Long enough that a burst of strokes triggers one save, short enough that
// closing the tab soon after you stop drawing doesn't lose work.
const SAVE_DEBOUNCE_MS = 3000

export type LoadState = 'loading' | 'ready' | 'error'
export type SaveState = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'

export function useCanvasPersistence() {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const editorRef = useRef<Editor | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLoadedRef = useRef(false)
  const hasPendingEditsRef = useRef(false)

  const cancelScheduledSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = null
  }

  // Saves the current drawing now. Also used by the "Retry" button.
  const saveNow = useCallback(async () => {
    const currentEditor = editorRef.current
    if (!currentEditor || !hasLoadedRef.current) return
    cancelScheduledSave()
    hasPendingEditsRef.current = false
    setSaveState('saving')
    try {
      await saveCanvas(getSnapshot(currentEditor.store))
      // Only mark saved if nothing new was drawn while the request was in flight.
      setSaveState(hasPendingEditsRef.current ? 'unsaved' : 'saved')
    } catch (err) {
      console.error('Could not save canvas:', err)
      hasPendingEditsRef.current = true
      setSaveState('error')
    }
  }, [])

  // Fetches the saved drawing into the editor. Also used by "Retry".
  const load = useCallback(async (targetEditor: Editor) => {
    hasLoadedRef.current = false
    setLoadState('loading')
    try {
      const data = await getCanvas()
      if (data.snapshot) {
        // Marked as a "remote" change so the save listener (user changes
        // only) ignores it. Otherwise tldraw reports the load itself as a
        // user edit and every page load triggers a pointless re-save.
        targetEditor.store.mergeRemoteChanges(() => {
          loadSnapshot(targetEditor.store, data.snapshot as TLEditorSnapshot)
        })
      }
      hasLoadedRef.current = true
      setLoadState('ready')
    } catch (err) {
      // The error overlay stays up (so nothing can be drawn) and offers Retry.
      console.error('Could not load canvas:', err)
      setLoadState('error')
    }
  }, [])

  const retryLoad = useCallback(() => {
    if (editorRef.current) void load(editorRef.current)
  }, [load])

  // Passed to <Tldraw onMount>. The returned function runs when the canvas
  // unmounts (navigating away).
  const handleMount = useCallback(
    (mountedEditor: Editor) => {
      editorRef.current = mountedEditor
      setEditor(mountedEditor)
      void load(mountedEditor)

      const scheduleSave = () => {
        if (!hasLoadedRef.current) return
        hasPendingEditsRef.current = true
        // Returning the same value lets React skip re-rendering on every stroke.
        setSaveState((current) => (current === 'unsaved' ? current : 'unsaved'))
        cancelScheduledSave()
        saveTimeoutRef.current = setTimeout(() => void saveNow(), SAVE_DEBOUNCE_MS)
      }
      const unsubscribe = mountedEditor.store.listen(scheduleSave, { source: 'user', scope: 'document' })

      const saveWhenHidden = () => {
        if (document.visibilityState === 'hidden' && hasPendingEditsRef.current) void saveNow()
      }
      document.addEventListener('visibilitychange', saveWhenHidden)

      return () => {
        unsubscribe()
        document.removeEventListener('visibilitychange', saveWhenHidden)
        cancelScheduledSave()
        if (hasLoadedRef.current && hasPendingEditsRef.current) {
          // The page is going away, so there's no state left to update -
          // just send the snapshot and log if it fails.
          saveCanvas(getSnapshot(mountedEditor.store)).catch((err) =>
            console.error('Could not save canvas while leaving:', err),
          )
        }
        editorRef.current = null
      }
    },
    [load, saveNow],
  )

  return { editor, loadState, saveState, handleMount, retryLoad, saveNow }
}
