import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/client'
import { createRecorderController, recordingFilename, type RecorderDeps, type RecorderLike } from '@/features/notes/recorderController'
import type { Note } from '@/types/note'

const SAVED_NOTE: Note = { id: 7, transcript: 'Buy milk', audio_url: 'https://audio/7', created_at: '2026-09-30 09:00:00' }

// A fake MediaRecorder: stop() hands over one chunk, then fires onstop.
function fakeRecorder(mimeType = 'audio/webm;codecs=opus', chunk: Blob = new Blob(['audio-bytes'])): RecorderLike {
  const recorder: RecorderLike = {
    mimeType,
    ondataavailable: null,
    onstop: null,
    start: vi.fn(),
    stop: vi.fn(() => {
      recorder.ondataavailable?.({ data: chunk })
      recorder.onstop?.()
    }),
  }
  return recorder
}

function setup(overrides: Partial<RecorderDeps> = {}) {
  const trackStop = vi.fn()
  const recorder = fakeRecorder()
  const deps: RecorderDeps = {
    isSupported: () => true,
    requestMicrophone: vi.fn(async () => ({ getTracks: () => [{ stop: trackStop }] })),
    createRecorder: vi.fn(() => recorder),
    upload: vi.fn(async (_audio: Blob, _name: string, onUploaded: () => void) => {
      onUploaded()
      return SAVED_NOTE
    }),
    now: () => 1000,
    onNoteSaved: vi.fn(),
    ...overrides,
  }
  const controller = createRecorderController(deps)
  const phases: string[] = []
  controller.subscribe(() => phases.push(controller.getState().phase))
  return { controller, deps, recorder, trackStop, phases }
}

describe('recorder controller', () => {
  it('goes idle -> requesting -> recording', async () => {
    const { controller, phases } = setup()
    await controller.start()
    expect(phases).toEqual(['requesting', 'recording'])
    expect(controller.getState().startedAt).toBe(1000)
  })

  it('reports a refused microphone without leaving anything recording', async () => {
    const { controller, deps } = setup({
      requestMicrophone: vi.fn(async () => {
        throw Object.assign(new Error('denied'), { name: 'NotAllowedError' })
      }),
    })
    await controller.start()
    expect(controller.getState().phase).toBe('error')
    expect(controller.getState().error?.kind).toBe('permission-denied')
    expect(deps.createRecorder).not.toHaveBeenCalled()
  })

  it('stops -> uploads -> processes -> saves, releasing the microphone', async () => {
    const { controller, deps, trackStop, phases } = setup()
    await controller.start()
    controller.stop()
    await vi.waitFor(() => expect(controller.getState().phase).toBe('success'))
    expect(phases).toEqual(['requesting', 'recording', 'uploading', 'uploading', 'processing', 'success'])
    expect(controller.getState().savedNote).toEqual(SAVED_NOTE)
    expect(deps.onNoteSaved).toHaveBeenCalledWith(SAVED_NOTE)
    expect(trackStop).toHaveBeenCalled()
    expect(vi.mocked(deps.upload).mock.calls[0][1]).toBe('recording.webm')
  })

  it('keeps the recording after a transcription failure, and Retry re-sends the same bytes', async () => {
    const upload = vi
      .fn<RecorderDeps['upload']>()
      .mockRejectedValueOnce(new ApiError('Transcription failed: Groq is down', 500))
      .mockResolvedValueOnce(SAVED_NOTE)
    const { controller } = setup({ upload })
    await controller.start()
    controller.stop()
    await vi.waitFor(() => expect(controller.getState().phase).toBe('error'))
    expect(controller.getState().error).toEqual({ kind: 'upload-failed', message: 'Transcription failed: Groq is down' })
    expect(controller.getState().hasPendingRecording).toBe(true)

    controller.retryUpload()
    await vi.waitFor(() => expect(controller.getState().phase).toBe('success'))
    expect(upload.mock.calls[1][0]).toBe(upload.mock.calls[0][0])
    expect(controller.getState().hasPendingRecording).toBe(false)
  })

  it('explains a network failure and keeps the recording', async () => {
    const { controller } = setup({ upload: vi.fn(async () => Promise.reject(new ApiError('offline', 0))) })
    await controller.start()
    controller.stop()
    await vi.waitFor(() => expect(controller.getState().phase).toBe('error'))
    expect(controller.getState().error?.message).toMatch(/recording is kept/)
    expect(controller.getState().hasPendingRecording).toBe(true)
  })

  it('cancel discards the recording without uploading', async () => {
    const { controller, deps, trackStop } = setup()
    await controller.start()
    controller.cancel()
    expect(controller.getState().phase).toBe('idle')
    expect(deps.upload).not.toHaveBeenCalled()
    expect(trackStop).toHaveBeenCalled()
  })

  it('ignores a second start while one is already starting or recording', async () => {
    const { controller, deps } = setup()
    const first = controller.start()
    void controller.start() // rapid double tap
    await first
    await controller.start() // tap while recording
    expect(deps.requestMicrophone).toHaveBeenCalledTimes(1)
    expect(controller.getState().phase).toBe('recording')
  })

  it("won't start over an unsaved recording until it's retried or discarded", async () => {
    const { controller, deps } = setup({ upload: vi.fn(async () => Promise.reject(new ApiError('Server error', 500))) })
    await controller.start()
    controller.stop()
    await vi.waitFor(() => expect(controller.getState().phase).toBe('error'))
    await controller.start()
    expect(deps.requestMicrophone).toHaveBeenCalledTimes(1)
    controller.reset()
    await controller.start()
    expect(deps.requestMicrophone).toHaveBeenCalledTimes(2)
  })

  it('releases the microphone if cancelled while the permission prompt is open', async () => {
    let grant: (stream: { getTracks: () => { stop: () => void }[] }) => void = () => {}
    const trackStop = vi.fn()
    const { controller } = setup({ requestMicrophone: () => new Promise((resolve) => (grant = resolve)) })
    const starting = controller.start()
    controller.cancel()
    grant({ getTracks: () => [{ stop: trackStop }] })
    await starting
    expect(controller.getState().phase).toBe('idle')
    expect(trackStop).toHaveBeenCalled()
  })

  it('reports an empty recording instead of uploading nothing', async () => {
    const { controller, deps } = setup({ createRecorder: () => fakeRecorder('audio/webm', new Blob([])) })
    await controller.start()
    controller.stop()
    expect(controller.getState().error?.kind).toBe('empty-recording')
    expect(deps.upload).not.toHaveBeenCalled()
  })

  it('names Safari recordings .mp4 and everything else .webm', () => {
    expect(recordingFilename('audio/mp4')).toBe('recording.mp4')
    expect(recordingFilename('audio/webm;codecs=opus')).toBe('recording.webm')
  })
})
