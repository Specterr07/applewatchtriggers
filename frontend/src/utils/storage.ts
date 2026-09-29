// Safe wrappers around localStorage.
//
// localStorage can throw (private browsing, storage blocked by the browser,
// quota full). A stored theme or timestamp is never worth crashing the app
// over, so a failure is logged and treated as "nothing stored".

// Returns the stored value, or null if it's missing or storage is unavailable.
export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch (err) {
    console.warn(`Could not read "${key}" from localStorage:`, err)
    return null
  }
}

// Stores a value; logs (but doesn't throw) if storage is unavailable.
export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch (err) {
    console.warn(`Could not save "${key}" to localStorage:`, err)
  }
}

// Removes a value; logs (but doesn't throw) if storage is unavailable.
export function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch (err) {
    console.warn(`Could not remove "${key}" from localStorage:`, err)
  }
}
