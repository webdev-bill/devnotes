import { useCallback, useState, type FormEvent } from 'react'
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

  const tagsState = useFetch(() => listTags(), [])
  const tags: Tag[] = tagsState.status === 'success' ? tagsState.data : []

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
      <p className="font-display text-xs text-ink/40">~/notes.md</p>
      <h1 className="mt-1 font-display text-xl font-semibold text-ink">Notes</h1>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="search"
            placeholder="grep…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="rounded-md border border-rule bg-panel px-3 py-1.5 font-display text-sm text-ink placeholder:text-ink/30 focus:border-keyword focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md border border-rule px-3 py-1.5 font-display text-sm text-ink/70 hover:border-keyword hover:text-keyword"
          >
            search
          </button>
        </form>

        <select
          value={tag}
          onChange={(event) => handleTagChange(event.target.value)}
          className="rounded-md border border-rule bg-panel px-3 py-1.5 font-display text-sm text-ink focus:border-keyword focus:outline-none"
        >
          <option value="">all tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.slug}>
              #{t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 divide-y divide-rule border-t border-rule">
        {state.status === 'loading' && <LoadingState />}
        {state.status === 'error' && <ErrorState message={state.message} />}
        {state.status === 'success' && (
          <>
            {state.data.data.length === 0 ? (
              <p className="py-12 text-center font-display text-sm text-ink">
                <span className="text-ink/35">// </span>no notes found
              </p>
            ) : (
              state.data.data.map((note, index) => (
                <Link key={note.id} to={`/notes/${note.id}`} className="block hover:bg-paper/60">
                  <NoteCard note={note} index={index} />
                </Link>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
