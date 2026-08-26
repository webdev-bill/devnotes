import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { listPublicNotes } from '../api/notes'
import { listTags } from '../api/tags'
import type { Tag } from '../api/types'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import NoteCard from '../components/NoteCard'
import { useFetch } from '../hooks/useFetch'

export default function NotesList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const tag = searchParams.get('tag') ?? ''

  // Keep the input in sync when `search` changes from outside typing (e.g.
  // browser back/forward) — adjusted during render, not via useEffect, to
  // avoid an extra render/commit cycle for what's just a prop-like sync.
  const [searchInput, setSearchInput] = useState(search)
  const [syncedSearch, setSyncedSearch] = useState(search)
  if (search !== syncedSearch) {
    setSyncedSearch(search)
    setSearchInput(search)
  }

  const [tags, setTags] = useState<Tag[]>([])
  useEffect(() => {
    listTags().then(setTags).catch(() => setTags([]))
  }, [])

  const state = useFetch(() => listPublicNotes({ search, tag }), [search, tag])

  const handleSearchSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault()
      const next = new URLSearchParams(searchParams)
      if (searchInput) {
        next.set('search', searchInput)
      } else {
        next.delete('search')
      }
      setSearchParams(next)
    },
    [searchInput, searchParams, setSearchParams],
  )

  function handleTagChange(nextTag: string) {
    const next = new URLSearchParams(searchParams)
    if (nextTag) {
      next.set('tag', nextTag)
    } else {
      next.delete('tag')
    }
    setSearchParams(next)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Notes</h1>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="search"
            placeholder="Search notes…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Search
          </button>
        </form>

        <select
          value={tag}
          onChange={(event) => handleTagChange(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        {state.status === 'loading' && <LoadingState />}
        {state.status === 'error' && <ErrorState message={state.message} />}
        {state.status === 'success' && (
          <>
            {state.data.data.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No notes found.</p>
            ) : (
              <div className="space-y-3">
                {state.data.data.map((note) => (
                  <Link key={note.id} to={`/notes/${note.id}`} className="block">
                    <NoteCard note={note} />
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
