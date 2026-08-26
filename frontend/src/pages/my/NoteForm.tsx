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
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
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
        <div className="mt-8 border-t border-gray-200 pt-6">
          {deleteError && <p className="mb-3 text-sm text-red-600">{deleteError}</p>}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete note'}
          </button>
        </div>
      )}
    </div>
  )
}
