import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { imagePath, uploadNoteImage } from '../api/images'
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
  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-selecting the same file later
    if (!file || !initialNote) return

    setImageError(null)
    setImageUploading(true)
    try {
      const image = await uploadNoteImage(initialNote.id, file)
      const markdown = `![${file.name}](${imagePath(image.id)})`
      const textarea = textareaRef.current

      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const next = content.slice(0, start) + markdown + content.slice(end)
        setContent(next)
        // Restore focus and place the cursor right after the inserted text.
        requestAnimationFrame(() => {
          textarea.focus()
          textarea.selectionStart = textarea.selectionEnd = start + markdown.length
        })
      } else {
        setContent((current) => current + markdown)
      }
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Image upload failed. Please try again.')
    } finally {
      setImageUploading(false)
    }
  }

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
            ref={textareaRef}
            id="content"
            required
            rows={14}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        </div>
        {initialNote ? (
          <div className="mt-2">
            <button
              type="button"
              disabled={imageUploading}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-rule px-3 py-1.5 font-display text-xs font-medium text-ink hover:bg-paper disabled:opacity-50"
            >
              {imageUploading ? 'uploading…' : '+ insert image'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageSelected}
              className="hidden"
            />
            {imageError && <p className="mt-1 font-body text-xs text-flag">{imageError}</p>}
          </div>
        ) : (
          <p className="mt-2 font-body text-xs text-ink/40">
            Save this note once before inserting images.
          </p>
        )}
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
        className="rounded-md bg-keyword px-4 py-2 font-display text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? 'saving…' : submitLabel}
      </button>
    </form>
  )
}
