import ReactMarkdown from 'react-markdown'
import { useParams } from 'react-router'
import { getPublicNote } from '../api/notes'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import TagPills from '../components/TagPills'
import { useFetch } from '../hooks/useFetch'

export default function NoteDetail() {
  const { id } = useParams<{ id: string }>()
  const state = useFetch(() => getPublicNote(id!), [id])

  if (state.status === 'loading') return <LoadingState />
  if (state.status === 'error') return <ErrorState message={state.message} />

  const note = state.data

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-gray-900">{note.title}</h1>
        {note.language && (
          <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
            {note.language}
          </span>
        )}
      </div>
      <div className="mt-2">
        <TagPills tags={note.tags} />
      </div>
      <div className="prose mt-6 max-w-none">
        {/*
          NEVER add rehype-raw (or any plugin enabling raw HTML passthrough)
          here. This is user-authored markdown rendered for arbitrary
          visitors — allowing raw HTML would be a stored XSS hole, and the
          app's auth token sits in localStorage specifically on the
          assumption that this renderer never executes injected HTML.
          See CLAUDE.md.
        */}
        <ReactMarkdown>{note.content}</ReactMarkdown>
      </div>
    </div>
  )
}
