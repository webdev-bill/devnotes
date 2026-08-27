import { useState, type FormEvent } from 'react'
import type { BlogPost, BlogPostPayload } from '../api/types'
import { inputClass, labelClass } from './formStyles'
import LineNumberedTextarea from './LineNumberedTextarea'

type BlogFormProps = {
  initialPost?: BlogPost
  onSubmit: (payload: BlogPostPayload) => Promise<void>
}

export default function BlogForm({ initialPost, onSubmit }: BlogFormProps) {
  const [title, setTitle] = useState(initialPost?.title ?? '')
  const [content, setContent] = useState(initialPost?.content ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPublished = initialPost?.published_at != null

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

      {error && (
        <p className="rounded-md border border-flag/30 bg-flag/5 px-3 py-2 font-body text-sm text-ink">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        {isPublished ? (
          <>
            <button
              type="button"
              disabled={submitting}
              onClick={() => submit(initialPost.published_at)}
              className="rounded-md bg-keyword px-4 py-2 font-display text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => submit(null)}
              className="rounded-md border border-flag/40 px-4 py-2 font-display text-sm font-medium text-flag hover:bg-flag/5 disabled:opacity-50"
            >
              Unpublish
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={submitting}
              onClick={() => submit(null)}
              className="rounded-md border border-rule px-4 py-2 font-display text-sm font-medium text-ink hover:bg-paper disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => submit(new Date().toISOString())}
              className="rounded-md bg-string px-4 py-2 font-display text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'publishing…' : 'Publish'}
            </button>
          </>
        )}
      </div>
    </form>
  )
}
