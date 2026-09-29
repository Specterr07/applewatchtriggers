// Light / Dark / System theme (spec §7.1). Light is the default.
//
// The chosen preference is saved under THEME_STORAGE. The actual switch is
// a `.dark` class on <html>, which swaps every token in styles/tokens.css.
// index.html applies the same class before React loads so there's no
// flash of the wrong theme; this provider keeps it in sync afterwards.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import { THEME_STORAGE } from '@/config'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { readStorage, writeStorage } from '@/utils/storage'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

type ThemeContextValue = {
  preference: ThemePreference
  // What's actually on screen (a 'system' preference resolves to one of these).
  resolvedTheme: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// Reads the saved preference; anything missing or unrecognised means Light.
function readSavedPreference(): ThemePreference {
  const saved = readStorage(THEME_STORAGE)
  return saved === 'dark' || saved === 'system' ? saved : 'light'
}

// Provides the theme to the whole app and applies it to <html>.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readSavedPreference)
  const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)')

  const resolvedTheme: ResolvedTheme =
    preference === 'system' ? (systemPrefersDark ? 'dark' : 'light') : preference

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
    // Tells the browser to draw native controls (scrollbars, date pickers) to match.
    root.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next)
    writeStorage(THEME_STORAGE, next)
  }

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Current theme + setter. Must be used inside <ThemeProvider>.
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme() must be used inside <ThemeProvider>.')
  return context
}
