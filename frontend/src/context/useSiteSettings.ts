import { useContext } from 'react'
import { SiteSettingsContext, type SiteSettingsContextValue } from './SiteSettingsContext'

export function useSiteSettings(): SiteSettingsContextValue {
  const context = useContext(SiteSettingsContext)
  if (!context) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider')
  }
  return context
}
