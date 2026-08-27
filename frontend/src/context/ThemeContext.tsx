import { createContext, useCallback, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'

// Unrelated to the auth token's localStorage key (frontend/src/api/token.ts)
// — this is a display preference, not sensitive data, so the XSS/localStorage
// rationale in CLAUDE.md doesn't apply here. Don't conflate the two.
function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Matches the same resolution order as index.html's inline no-flash
  // script, which already set data-theme on <html> before this ever runs —
  // this just needs to agree with what's already painted, not repaint it.
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.setAttribute('data-theme', next)
    setThemeState(next)
  }, [])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
