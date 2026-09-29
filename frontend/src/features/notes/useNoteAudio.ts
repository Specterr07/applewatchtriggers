// Playback for one note's audio, with recovery for expired links
// (see audioRecovery.ts): on an error, fetch a fresh link once, resume where
// playback stopped, and report anything that still fails.

import { useEffect, useRef, useState, type SyntheticEvent } from 'react'

import { recoverPlayback } from '@/features/notes/audioRecovery'
import { useNotes } from '@/hooks/useNotes'
import type { Note } from '@/types/note'

export type AudioStatus = 'ready' | 'recovering' | 'failed'

export function useNoteAudio(note: Note) {
  const notesQuery = useNotes()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [src, setSrc] = useState(note.audio_url)
  const [status, setStatus] = useState<AudioStatus>(note.audio_url ? 'ready' : 'failed')
  const [errorMessage, setErrorMessage] = useState<string | null>(note.audio_url ? null : 'This recording isn’t available right now.')
  const [isPlaying, setIsPlaying] = useState(false)
  const hasRetriedRef = useRef(false)
  const resumeAtRef = useRef<number | null>(null)

  // A list refresh mints new links. Only adopt one for audio that hasn't
  // started yet - swapping mid-listen would jump back to the beginning.
  useEffect(() => {
    const element = audioRef.current
    if (note.audio_url && note.audio_url !== src && (!element || (element.paused && element.currentTime === 0))) {
      setSrc(note.audio_url)
      setStatus('ready')
      setErrorMessage(null)
    }
  }, [note.audio_url, src])

  // After switching to a fresh link, pick up where playback stopped.
  useEffect(() => {
    const element = audioRef.current
    if (!element || resumeAtRef.current === null) return
    const resumeAt = resumeAtRef.current
    resumeAtRef.current = null
    element.load()
    element.addEventListener('loadedmetadata', () => (element.currentTime = resumeAt), { once: true })
    element.play().catch(() => {}) // may be blocked without a fresh tap; the user can press play
  }, [src])

  const refreshUrl = async () => {
    const result = await notesQuery.refetch()
    if (result.isError) throw result.error
    return result.data?.find((n) => n.id === note.id)?.audio_url ?? null
  }

  const recover = async (alreadyRetried: boolean) => {
    const element = audioRef.current
    setStatus('recovering')
    const outcome = await recoverPlayback({ failedUrl: src, alreadyRetried, refreshUrl })
    if (outcome.kind === 'retry') {
      hasRetriedRef.current = true
      resumeAtRef.current = element?.currentTime ?? 0
      setSrc(outcome.url)
      setStatus('ready')
    } else {
      setStatus('failed')
      setErrorMessage(outcome.message)
    }
  }

  const audioProps = {
    ref: audioRef,
    src: src ?? undefined,
    onError: () => void recover(hasRetriedRef.current),
    onPlay: (event: SyntheticEvent<HTMLAudioElement>) => {
      // One recording at a time: pause any other note that's playing.
      document.querySelectorAll('audio').forEach((other) => other !== event.currentTarget && other.pause())
      setIsPlaying(true)
    },
    onPlaying: () => (hasRetriedRef.current = false), // it worked; a later failure may retry again
    onPause: () => setIsPlaying(false),
    onEnded: () => setIsPlaying(false),
  }

  const togglePlay = () => {
    const element = audioRef.current
    if (!element) return
    if (element.paused) element.play().catch(() => {}) // failures arrive via onError
    else element.pause()
  }

  // User-initiated retry after a reported failure.
  const retry = () => {
    hasRetriedRef.current = false
    setErrorMessage(null)
    void recover(false)
  }

  return { audioProps, status, errorMessage, isPlaying, togglePlay, retry }
}
