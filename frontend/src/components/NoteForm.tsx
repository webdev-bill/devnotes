import { useState, type FormEvent } from 'react'
import type { Note, NotePayload, NoteVisibility } from '../api/types'

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700">
          Content (Markdown)
        </label>
        <textarea
          id="content"
          required
          rows={12}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700">
            Language (optional)
          </label>
          <input
            id="language"
            type="text"
            placeholder="e.g. php, javascript"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <span className="block text-sm font-medium text-gray-700">Visibility</span>
          <div className="mt-2 flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === 'private'}
                onChange={() => setVisibility('private')}
              />
              Private
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
              />
              Public
            </label>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
          Tags (comma-separated)
        </label>
        <input
          id="tags"
          type="text"
          placeholder="php, laravel"
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
