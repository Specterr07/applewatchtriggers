// Playback links for notes are presigned Tigris URLs that the server mints
// fresh on every GET /api/notes and that expire after an hour
// (services/object_storage.py). These rules decide when a link is too old
// to trust, and what to do when playback fails.

// Refresh links a little before the server's 60-minute expiry (spec §4.6).
export const AUDIO_URL_MAX_AGE_MS = 50 * 60 * 1000

// True when links fetched at `fetchedAtMs` are old enough to refresh first.
export function isAudioUrlStale(fetchedAtMs: number, nowMs: number): boolean {
  return nowMs - fetchedAtMs >= AUDIO_URL_MAX_AGE_MS
}

export type PlaybackRecovery =
  | { kind: 'retry'; url: string }
  | { kind: 'failed'; message: string }

// After a playback error: fetch a fresh link and try ONCE more. A second
// failure, a failed refresh, or getting the same/no link back means the
// problem isn't expiry - so report it instead of retrying forever.
export async function recoverPlayback({
  failedUrl,
  alreadyRetried,
  refreshUrl,
}: {
  failedUrl: string | null
  alreadyRetried: boolean
  refreshUrl: () => Promise<string | null>
}): Promise<PlaybackRecovery> {
  if (alreadyRetried) return { kind: 'failed', message: 'This recording couldn’t be played.' }

  let freshUrl: string | null
  try {
    freshUrl = await refreshUrl()
  } catch {
    return { kind: 'failed', message: 'Couldn’t get a new playback link. Check your connection.' }
  }
  if (!freshUrl) return { kind: 'failed', message: 'This recording isn’t available right now.' }
  if (freshUrl === failedUrl) return { kind: 'failed', message: 'This recording couldn’t be played.' }
  return { kind: 'retry', url: freshUrl }
}
