import { useState } from 'react'
import { Link } from 'react-router'
import { deleteNote, listMyNotes } from '../../api/notes'
import type { Note } from '../../api/types'
import ErrorState from '../../components/ErrorState'
import LoadingState from '../../components/LoadingState'
import NoteCard from '../../components/NoteCard'
import VisibilityBadge from '../../components/VisibilityBadge'
import { useFetch } from '../../hooks/useFetch'

export default function NotesDashboard() {
  const state = useFetch(() => listMyNotes(), [])
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete(note: Note) {
    if (!confirm(`Delete "${note.title}"? This can't be undone.`)) return

    setDeleteError(null)
    setDeletingId(note.id)
    try {
      await deleteNote(String(note.id))
      state.refetch()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete note.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">My Notes</h1>
        <Link
          to="/my/notes/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          New note
        </Link>
      </div>

      {deleteError && <p className="mt-4 text-sm text-red-600">{deleteError}</p>}

      <div className="mt-6">
        {state.status === 'loading' && <LoadingState />}
        {state.status === 'error' && <ErrorState message={state.message} />}
        {state.status === 'success' && (
          <>
            {state.data.data.length === 0 ? (
              <p className="py-8 text-center text-gray-500">
                No notes yet — create your first one.
              </p>
            ) : (
              <div className="space-y-3">
                {state.data.data.map((note) => (
                  <div key={note.id} className="relative">
                    <NoteCard note={note} />
                    <div className="mt-2 flex items-center gap-3 px-1">
                      <VisibilityBadge visibility={note.visibility} />
                      <Link
                        to={`/my/notes/${note.id}/edit`}
                        className="text-sm text-indigo-600 hover:text-indigo-500"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(note)}
                        disabled={deletingId === note.id}
                        className="text-sm text-red-600 hover:text-red-500 disabled:opacity-50"
                      >
                        {deletingId === note.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
