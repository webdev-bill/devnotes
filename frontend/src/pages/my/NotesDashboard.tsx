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
        <div>
          <p className="font-display text-xs text-ink/40">~/dashboard.md</p>
          <h1 className="mt-1 font-display text-xl font-semibold text-ink">My Notes</h1>
        </div>
        <Link
          to="/my/notes/new"
          className="rounded-md bg-keyword px-4 py-2 font-display text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          + new note
        </Link>
      </div>

      {deleteError && (
        <p className="mt-4 rounded-md border border-flag/30 bg-flag/5 px-3 py-2 font-body text-sm text-ink">
          {deleteError}
        </p>
      )}

      <div className="mt-6 divide-y divide-rule border-t border-rule">
        {state.status === 'loading' && <LoadingState />}
        {state.status === 'error' && <ErrorState message={state.message} />}
        {state.status === 'success' && (
          <>
            {state.data.data.length === 0 ? (
              <p className="py-12 text-center font-display text-sm text-ink">
                <span className="text-ink/35">// </span>nothing here yet — write your first note
              </p>
            ) : (
              state.data.data.map((note, index) => (
                <div key={note.id} className="flex flex-wrap items-center gap-x-3">
                  <div className="min-w-0 flex-1">
                    <NoteCard note={note} index={index} />
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <VisibilityBadge visibility={note.visibility} />
                    <Link
                      to={`/my/notes/${note.id}/edit`}
                      className="font-display text-xs text-keyword hover:underline"
                    >
                      edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(note)}
                      disabled={deletingId === note.id}
                      className="font-display text-xs text-flag hover:underline disabled:opacity-50"
                    >
                      {deletingId === note.id ? 'deleting…' : 'delete'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
