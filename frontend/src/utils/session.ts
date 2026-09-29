// The browser "session": this browser holding a copy of the shared API key,
// plus a last-active timestamp for the 24-hour sliding expiry.
//
// This deliberately matches static/index.html exactly (same keys, same
// rules), so signing in or out in one app does the same in the other.

import { API_KEY_STORAGE, SESSION_EXPIRY_MS, SESSION_LAST_ACTIVE_STORAGE } from '@/config'
import { readStorage, removeStorage, writeStorage } from '@/utils/storage'

// The stored API key, or null when signed out.
export function getStoredApiKey(): string | null {
  return readStorage(API_KEY_STORAGE)
}

// Saves a key that has just been verified against the server.
export function storeApiKey(apiKey: string): void {
  writeStorage(API_KEY_STORAGE, apiKey)
}

// Marks the session as active right now (called after every request the server accepted).
export function touchSession(): void {
  writeStorage(SESSION_LAST_ACTIVE_STORAGE, String(Date.now()))
}

// True when there's no activity timestamp, or the last activity is too old.
export function isSessionExpired(): boolean {
  const lastActive = parseInt(readStorage(SESSION_LAST_ACTIVE_STORAGE) || '0', 10)
  // parseInt of garbage gives NaN, which is falsy - treated as "expired".
  return !lastActive || Date.now() - lastActive > SESSION_EXPIRY_MS
}

// Forgets the key and the activity timestamp (sign out).
export function clearSession(): void {
  removeStorage(API_KEY_STORAGE)
  removeStorage(SESSION_LAST_ACTIVE_STORAGE)
}
