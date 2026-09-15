import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { updateSiteSettings, uploadFavicon, uploadSiteOgImage, deleteSiteOgImage } from '../api/settings'
import type { SiteSettings } from '../api/types'
import { inputClass, labelClass } from './formStyles'

type SiteSettingsFormProps = {
  initialSettings: SiteSettings
}

export default function SiteSettingsForm({ initialSettings }: SiteSettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [siteTitle, setSiteTitle] = useState(initialSettings.site_title)
  const [metaDescription, setMetaDescription] = useState(initialSettings.meta_description ?? '')
  const [twitterHandle, setTwitterHandle] = useState(initialSettings.twitter_handle ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [faviconBusy, setFaviconBusy] = useState(false)
  const [faviconError, setFaviconError] = useState<string | null>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  const [ogImageBusy, setOgImageBusy] = useState(false)
  const [ogImageError, setOgImageError] = useState<string | null>(null)
  const ogImageInputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaved(false)
    setSubmitting(true)
    try {
      const updated = await updateSiteSettings({
        site_title: siteTitle,
        meta_description: metaDescription || null,
        twitter_handle: twitterHandle || null,
      })
      setSettings(updated)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFaviconSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setFaviconError(null)
    setFaviconBusy(true)
    try {
      setSettings(await uploadFavicon(file))
    } catch (err) {
      setFaviconError(err instanceof Error ? err.message : 'Favicon upload failed. Please try again.')
    } finally {
      setFaviconBusy(false)
    }
  }

  async function handleOgImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setOgImageError(null)
    setOgImageBusy(true)
    try {
      setSettings(await uploadSiteOgImage(file))
    } catch (err) {
      setOgImageError(err instanceof Error ? err.message : 'OG image upload failed. Please try again.')
    } finally {
      setOgImageBusy(false)
    }
  }

  async function handleRemoveOgImage() {
    setOgImageError(null)
    setOgImageBusy(true)
    try {
      await deleteSiteOgImage()
      setSettings((current) => ({ ...current, og_image_url: null }))
    } catch (err) {
      setOgImageError(err instanceof Error ? err.message : 'Removing the OG image failed. Please try again.')
    } finally {
      setOgImageBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div>
        <label htmlFor="siteTitle" className={labelClass}>
          Site title
        </label>
        <input
          id="siteTitle"
          type="text"
          required
          value={siteTitle}
          onChange={(event) => setSiteTitle(event.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="metaDescription" className={labelClass}>
          Default meta description
        </label>
        <textarea
          id="metaDescription"
          rows={3}
          value={metaDescription}
          onChange={(event) => setMetaDescription(event.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="twitterHandle" className={labelClass}>
          Twitter handle
        </label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-body text-sm text-ink/40">
            @
          </span>
          <input
            id="twitterHandle"
            type="text"
            value={twitterHandle}
            onChange={(event) => setTwitterHandle(event.target.value.replace(/^@/, ''))}
            placeholder="handle"
            className={`${inputClass} mt-0 pl-7`}
          />
        </div>
      </div>

      <div>
        <span className={labelClass}>Favicon</span>
        <div className="mt-2">
          {(settings.favicon_png_url || settings.favicon_ico_url) && (
            <img
              src={settings.favicon_png_url ?? settings.favicon_ico_url ?? undefined}
              alt=""
              className="mb-2 h-10 w-10 rounded border border-rule"
            />
          )}
          <button
            type="button"
            disabled={faviconBusy}
            onClick={() => faviconInputRef.current?.click()}
            className="rounded-md border border-rule px-3 py-1.5 font-display text-xs font-medium text-ink hover:bg-paper disabled:opacity-50"
          >
            {faviconBusy ? 'working…' : settings.favicon_ico_url ? 'replace favicon' : '+ upload favicon'}
          </button>
          <input
            ref={faviconInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFaviconSelected}
            className="hidden"
          />
          {faviconError && <p className="mt-1 font-body text-xs text-flag">{faviconError}</p>}
          <p className="mt-1 font-body text-xs text-ink/40">
            Generates a standard .ico plus a 512×512 PNG from whatever image you upload.
          </p>
        </div>
      </div>

      <div>
        <span className={labelClass}>Default OG image</span>
        <div className="mt-2">
          {settings.og_image_url && (
            <img
              src={settings.og_image_url}
              alt=""
              className="mb-2 max-h-40 rounded-md border border-rule"
            />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={ogImageBusy}
              onClick={() => ogImageInputRef.current?.click()}
              className="rounded-md border border-rule px-3 py-1.5 font-display text-xs font-medium text-ink hover:bg-paper disabled:opacity-50"
            >
              {ogImageBusy ? 'working…' : settings.og_image_url ? 'replace image' : '+ upload image'}
            </button>
            {settings.og_image_url && (
              <button
                type="button"
                disabled={ogImageBusy}
                onClick={handleRemoveOgImage}
                className="rounded-md border border-flag/40 px-3 py-1.5 font-display text-xs font-medium text-flag hover:bg-flag/5 disabled:opacity-50"
              >
                remove
              </button>
            )}
          </div>
          <input
            ref={ogImageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleOgImageSelected}
            className="hidden"
          />
          {ogImageError && <p className="mt-1 font-body text-xs text-flag">{ogImageError}</p>}
          <p className="mt-1 font-body text-xs text-ink/40">
            Used for any post without its own OG image override, and for the homepage.
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-flag/30 bg-flag/5 px-3 py-2 font-body text-sm text-ink">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-keyword px-4 py-2 font-display text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'saving…' : 'Save'}
        </button>
        {saved && <span className="font-display text-xs text-string">saved</span>}
      </div>
    </form>
  )
}
