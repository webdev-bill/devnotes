import { createContext, useEffect, useState, type ReactNode } from 'react'
import { getPublicSiteSettings } from '../api/settings'
import type { SiteSettings } from '../api/types'

export type SiteSettingsContextValue = {
  // null until the initial fetch resolves — every consumer must render
  // sensible defaults for that window rather than blocking on a spinner;
  // this is meta/favicon data, not primary content.
  settings: SiteSettings | null
}

export const SiteSettingsContext = createContext<SiteSettingsContextValue | null>(null)

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null)

  useEffect(() => {
    let cancelled = false
    getPublicSiteSettings()
      .then((data) => {
        if (!cancelled) setSettings(data)
      })
      .catch(() => {
        // Silent — Layout/BlogDetail already fall back to hardcoded defaults
        // when settings is null, and this is non-critical meta/favicon data,
        // not something worth surfacing an error state for.
      })
    return () => {
      cancelled = true
    }
  }, [])

  return <SiteSettingsContext.Provider value={{ settings }}>{children}</SiteSettingsContext.Provider>
}
