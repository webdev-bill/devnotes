import { useRef, useState, type ChangeEvent } from 'react'
import { deleteBlogPostOgImage, uploadBlogPostOgImage } from '../api/settings'
import type { BlogPost } from '../api/types'
import { inputClass, labelClass } from './formStyles'

type SeoFieldsSectionProps = {
  initialPost?: BlogPost
  metaTitle: string
  metaDescription: string
  onMetaTitleChange: (value: string) => void
  onMetaDescriptionChange: (value: string) => void
}

// Collapsible — most posts never need these, so they stay out of the way of
// the primary title/content/publish flow until opened. Same
// upload/replace/remove pattern as the cover-image block above (BlogForm.tsx),
// just targeting the OG-image-override endpoint instead of the cover-image one.
export default function SeoFieldsSection({
  initialPost,
  metaTitle,
  metaDescription,
  onMetaTitleChange,
  onMetaDescriptionChange,
}: SeoFieldsSectionProps) {
  const [ogImageUrl, setOgImageUrl] = useState<string | null>(initialPost?.og_image_url ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !initialPost) return

    setError(null)
    setBusy(true)
    try {
      const updated = await uploadBlogPostOgImage(initialPost.slug, file)
      setOgImageUrl(updated.og_image_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OG image upload failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveImage() {
    if (!initialPost) return

    setError(null)
    setBusy(true)
    try {
      await deleteBlogPostOgImage(initialPost.slug)
      setOgImageUrl(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Removing the OG image failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className="rounded-md border border-rule">
      <summary className="cursor-pointer px-4 py-2.5 font-display text-xs tracking-wide text-ink/60 uppercase">
        SEO (optional — falls back to site defaults when unset)
      </summary>
      <div className="space-y-4 border-t border-rule px-4 py-4">
        <div>
          <label htmlFor="metaTitle" className={labelClass}>
            Meta title
          </label>
          <input
            id="metaTitle"
            type="text"
            value={metaTitle}
            onChange={(event) => onMetaTitleChange(event.target.value)}
            placeholder="Defaults to the post title above"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="metaDescription" className={labelClass}>
            Meta description
          </label>
          <textarea
            id="metaDescription"
            rows={2}
            value={metaDescription}
            onChange={(event) => onMetaDescriptionChange(event.target.value)}
            placeholder="Defaults to the site-wide description"
            className={inputClass}
          />
        </div>

        <div>
          <span className={labelClass}>OG image override</span>
          {initialPost ? (
            <div className="mt-2">
              {ogImageUrl && (
                <img src={ogImageUrl} alt="" className="mb-2 max-h-40 rounded-md border border-rule" />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md border border-rule px-3 py-1.5 font-display text-xs font-medium text-ink hover:bg-paper disabled:opacity-50"
                >
                  {busy ? 'working…' : ogImageUrl ? 'replace image' : '+ upload image'}
                </button>
                {ogImageUrl && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleRemoveImage}
                    className="rounded-md border border-flag/40 px-3 py-1.5 font-display text-xs font-medium text-flag hover:bg-flag/5 disabled:opacity-50"
                  >
                    remove
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageSelected}
                className="hidden"
              />
              {error && <p className="mt-1 font-body text-xs text-flag">{error}</p>}
            </div>
          ) : (
            <p className="mt-2 font-body text-xs text-ink/40">Save this post once before setting an OG image.</p>
          )}
        </div>
      </div>
    </details>
  )
}
