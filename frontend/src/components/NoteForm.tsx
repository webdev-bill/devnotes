import { useState, type FormEvent } from 'react'
import type { Note, NotePayload, NoteVisibility } from '../api/types'
import { inputClass, labelClass } from './formStyles'
import LineNumberedTextarea from './LineNumberedTextarea'

type NoteFormProps = {
  initialNote?: Note
  onSubmit: (payload: NotePayload) => Promise<void>
  submitLabel: string
}

export default function NoteForm({ initialNote, onSubmit, submitLabel }: NoteFormProps) {
  const [title, setTitle] = useState(initialNote?.title ?? '')
  const [content, setContent] = useState(initialNote?.content ?? '')
  const [language, setLanguage] = useState(initialNote?.language ?? '')
  const [visibility, setVisibility] = useState<NoteVisibility>(initialNote?.visibility ?? 'private')
  const [tagsInput, setTagsInput] = useState(initialNote?.tags.map((tag) => tag.name).join(', ') ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    try {
      await onSubmit({
        title,
        content,
        language: language.trim() === '' ? null : language.trim(),
        visibility,
        tags,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
            rows={14}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="language" className={labelClass}>
            Language (optional)
          </label>
          <input
            id="language"
            type="text"
            placeholder="php, javascript…"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className={`${inputClass} font-display`}
          />
        </div>
        <div>
          <span className={labelClass}>Visibility</span>
          <div className="mt-2.5 flex gap-5">
            <label className="flex items-center gap-2 font-body text-sm text-ink">
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === 'private'}
                onChange={() => setVisibility('private')}
                className="accent-ink"
              />
              Private
            </label>
            <label className="flex items-center gap-2 font-body text-sm text-ink">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
                className="accent-string"
              />
              Public
            </label>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="tags" className={labelClass}>
          Tags (comma-separated)
        </label>
        <input
          id="tags"
          type="text"
          placeholder="php, laravel"
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          className={`${inputClass} font-display`}
        />
      </div>

      {error && (
        <p className="rounded-md border border-flag/30 bg-flag/5 px-3 py-2 font-body text-sm text-ink">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-keyword px-4 py-2 font-display text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? 'saving…' : submitLabel}
      </button>
    </form>
  )
}
