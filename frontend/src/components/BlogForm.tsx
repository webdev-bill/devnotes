import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { API_URL } from '../api/client'
import { deleteBlogPostCoverImage, imagePath, uploadBlogPostCoverImage } from '../api/images'
import type { BlogPost, BlogPostPayload, Image } from '../api/types'
import { inputClass, labelClass } from './formStyles'
import LineNumberedTextarea from './LineNumberedTextarea'
import { getPostStatus, postStatusStyle } from '../lib/postStatus'

type BlogFormProps = {
  initialPost?: BlogPost
  onSubmit: (payload: BlogPostPayload) => Promise<void>
}

// datetime-local wants "YYYY-MM-DDTHH:mm" in the viewer's local time, but
// Date.toISOString() always renders UTC — shift by the timezone offset first
// so the displayed value matches the wall-clock time the timestamp represents.
function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso)
  const localMs = date.getTime() - date.getTimezoneOffset() * 60000
  return new Date(localMs).toISOString().slice(0, 16)
}

function formatDateLabel(date: Date): string {
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

const primaryButtonLabel: Record<'draft' | 'scheduled' | 'published', string> = {
  draft: 'Save draft',
  scheduled: 'Schedule',
  published: 'Publish',
}

const primaryButtonBusyLabel: Record<'draft' | 'scheduled' | 'published', string> = {
  draft: 'saving…',
  scheduled: 'scheduling…',
  published: 'publishing…',
}

export default function BlogForm({ initialPost, onSubmit }: BlogFormProps) {
  const [title, setTitle] = useState(initialPost?.title ?? '')
  const [content, setContent] = useState(initialPost?.content ?? '')
  const [publishedAtInput, setPublishedAtInput] = useState(
    initialPost?.published_at ? toDatetimeLocalValue(initialPost.published_at) : '',
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [coverImage, setCoverImage] = useState<Image | null>(initialPost?.cover_image ?? null)
  const [coverImageBusy, setCoverImageBusy] = useState(false)
  const [coverImageError, setCoverImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Whether the post currently exists in a live/scheduled state on the
  // server — drives the Unpublish shortcut, independent of unsaved edits
  // to the date field below.
  const canUnpublish = initialPost?.published_at != null

  const pendingDate = publishedAtInput ? new Date(publishedAtInput) : null
  const status = getPostStatus(pendingDate ? pendingDate.toISOString() : null)
  const { dot, text } = postStatusStyle[status]
  const statusLabel =
    status === 'draft'
      ? 'Draft'
      : status === 'scheduled'
        ? `Scheduled for ${formatDateLabel(pendingDate!)}`
        : `Published ${formatDateLabel(pendingDate!)}`

  async function handleCoverImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !initialPost) return

    setCoverImageError(null)
    setCoverImageBusy(true)
    try {
      const updated = await uploadBlogPostCoverImage(initialPost.slug, file)
      setCoverImage(updated.cover_image)
    } catch (err) {
      setCoverImageError(err instanceof Error ? err.message : 'Cover image upload failed. Please try again.')
    } finally {
      setCoverImageBusy(false)
    }
  }

  async function handleRemoveCoverImage() {
    if (!initialPost) return

    setCoverImageError(null)
    setCoverImageBusy(true)
    try {
      await deleteBlogPostCoverImage(initialPost.slug)
      setCoverImage(null)
    } catch (err) {
      setCoverImageError(err instanceof Error ? err.message : 'Removing the cover image failed. Please try again.')
    } finally {
      setCoverImageBusy(false)
    }
  }

  async function submit(publishedAt: string | null) {
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit({ title, content, published_at: publishedAt })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    // No button here is type="submit" — publishing/unpublishing is a real
    // consequence, not something that should fire because Enter was pressed
    // in the title field. Every action is an explicit click.
    <form onSubmit={(event: FormEvent) => event.preventDefault()} className="space-y-5">
      <div>
        <label htmlFor="title" className={labelClass}>
          Title
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <span className={labelClass}>Cover image</span>
        {initialPost ? (
          <div className="mt-2">
            {coverImage && (
              <img
                src={`${API_URL}${imagePath(coverImage.id)}`}
                alt=""
                className="mb-2 max-h-40 rounded-md border border-rule"
              />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={coverImageBusy}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md border border-rule px-3 py-1.5 font-display text-xs font-medium text-ink hover:bg-paper disabled:opacity-50"
              >
                {coverImageBusy ? 'working…' : coverImage ? 'replace image' : '+ upload image'}
              </button>
              {coverImage && (
                <button
                  type="button"
                  disabled={coverImageBusy}
                  onClick={handleRemoveCoverImage}
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
              onChange={handleCoverImageSelected}
              className="hidden"
            />
            {coverImageError && <p className="mt-1 font-body text-xs text-flag">{coverImageError}</p>}
          </div>
        ) : (
          <p className="mt-2 font-body text-xs text-ink/40">Save this post once before setting a cover image.</p>
        )}
      </div>

      <div>
        <label htmlFor="content" className={labelClass}>
          Content (Markdown)
        </label>
        <div className="mt-1">
          <LineNumberedTextarea
            id="content"
            required
            rows={16}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="publishedAt" className={labelClass}>
            Publish date
          </label>
          <button
            type="button"
            onClick={() => setPublishedAtInput(toDatetimeLocalValue(new Date().toISOString()))}
            className="font-display text-xs text-keyword hover:underline"
          >
            Publish now
          </button>
        </div>
        <input
          id="publishedAt"
          type="datetime-local"
          value={publishedAtInput}
          onChange={(event) => setPublishedAtInput(event.target.value)}
          className={inputClass}
        />
        <p className={`mt-1.5 inline-flex items-center gap-1.5 font-display text-xs ${text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          {statusLabel}
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-flag/30 bg-flag/5 px-3 py-2 font-body text-sm text-ink">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={submitting}
          onClick={() => submit(pendingDate ? pendingDate.toISOString() : null)}
          className={
            status === 'draft'
              ? 'rounded-md border border-rule px-4 py-2 font-display text-sm font-medium text-ink hover:bg-paper disabled:opacity-50'
              : 'rounded-md bg-string px-4 py-2 font-display text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50'
          }
        >
          {submitting ? primaryButtonBusyLabel[status] : primaryButtonLabel[status]}
        </button>
        {canUnpublish && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => submit(null)}
            className="rounded-md border border-flag/40 px-4 py-2 font-display text-sm font-medium text-flag hover:bg-flag/5 disabled:opacity-50"
          >
            Unpublish
          </button>
        )}
      </div>
    </form>
  )
}
