import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { createNote, deleteNote, getMyNote, updateNote } from '../../api/notes'
import type { NotePayload } from '../../api/types'
import ErrorState from '../../components/ErrorState'
import LoadingState from '../../components/LoadingState'
import NoteFormFields from '../../components/NoteForm'
import { useFetch } from '../../hooks/useFetch'

export default function NoteForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = id !== undefined
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Only fetch when editing — creating needs no existing data to load, and
  // must not hit the API with a request for a nonexistent "undefined" id.
  const state = useFetch(() => (id ? getMyNote(id) : Promise.resolve(undefined)), [id])

  async function handleSubmit(payload: NotePayload) {
    if (isEditing) {
      await updateNote(id, payload)
    } else {
      await createNote(payload)
    }
    navigate('/my/notes')
  }

  async function handleDelete() {
    if (!id) return
    if (!confirm("Delete this note? This can't be undone.")) return

    setDeleteError(null)
    setDeleting(true)
    try {
      await deleteNote(id)
      navigate('/my/notes')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete note.')
      setDeleting(false)
    }
  }

  if (isEditing && state.status === 'loading') return <LoadingState />
  if (isEditing && state.status === 'error') return <ErrorState message={state.message} />

  return (
    // A bit wider than the pure-reading column on NoteDetail (max-w-2xl) —
    // the content field here is code, which wants more horizontal room than
    // prose, but still bounded well short of the full workspace width so the
    // title/tags/visibility inputs don't stretch absurdly wide.
    <div className="max-w-3xl">
      <p className="font-display text-xs text-ink/40">
        {isEditing ? `~/notes/${id}.md` : '~/notes/new.md'}
      </p>
      <h1 className="mt-1 font-display text-xl font-semibold text-ink">
        {isEditing ? 'Edit note' : 'New note'}
      </h1>
      <div className="mt-6">
        <NoteFormFields
          initialNote={isEditing && state.status === 'success' ? state.data : undefined}
          onSubmit={handleSubmit}
          submitLabel={isEditing ? 'Save changes' : 'Create note'}
        />
      </div>

      {isEditing && (
        <div className="mt-8 border-t border-rule pt-6">
          {deleteError && (
            <p className="mb-3 rounded-md border border-flag/30 bg-flag/5 px-3 py-2 font-body text-sm text-ink">
              {deleteError}
            </p>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md border border-flag/40 px-4 py-2 font-display text-sm font-medium text-flag hover:bg-flag/5 disabled:opacity-50"
          >
            {deleting ? 'deleting…' : 'Delete note'}
          </button>
        </div>
      )}
    </div>
  )
}
