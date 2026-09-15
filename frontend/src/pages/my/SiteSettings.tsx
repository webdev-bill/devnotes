import { getMySiteSettings } from '../../api/settings'
import SiteSettingsForm from '../../components/SiteSettingsForm'
import ErrorState from '../../components/ErrorState'
import LoadingState from '../../components/LoadingState'
import { useFetch } from '../../hooks/useFetch'

export default function SiteSettingsPage() {
  const state = useFetch(() => getMySiteSettings(), [])

  return (
    <div>
      <p className="font-display text-xs text-ink/40">~/settings.md</p>
      <h1 className="mt-1 font-display text-xl font-semibold text-ink">Website Settings</h1>
      <p className="mt-2 max-w-2xl font-body text-sm text-ink/60">
        Controls the title, meta tags, favicon, and default social-preview image used across
        the site — including how links to it look when shared on Slack, Twitter, Discord, and
        Facebook.
      </p>

      <div className="mt-6">
        {state.status === 'loading' && <LoadingState />}
        {state.status === 'error' && <ErrorState message={state.message} />}
        {state.status === 'success' && <SiteSettingsForm initialSettings={state.data} />}
      </div>
    </div>
  )
}
