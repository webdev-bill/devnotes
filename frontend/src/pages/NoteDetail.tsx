import ReactMarkdown from 'react-markdown'
import { useParams } from 'react-router'
import { getPublicNote } from '../api/notes'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import TagPills from '../components/TagPills'
import { useFetch } from '../hooks/useFetch'
import { markdownComponents, markdownRemarkPlugins } from '../markdown/markdownConfig'
import { proseClassName } from '../markdown/proseClassName'

export default function NoteDetail() {
  const { id } = useParams<{ id: string }>()
  const state = useFetch(() => getPublicNote(id!), [id])

  if (state.status === 'loading') return <LoadingState />
  if (state.status === 'error') return <ErrorState message={state.message} />

  const note = state.data

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule pb-3">
        <p className="font-display text-xs text-ink/40">
          ~/notes/{note.id}.md
          {note.language && <span className="text-ink/60"> [{note.language}]</span>}
        </p>
        <TagPills tags={note.tags} />
      </div>
      <h1 className="mt-4 font-display text-xl font-semibold text-ink">{note.title}</h1>
      {/* Constrained to a readable line length even though the shell itself
          is wide now — a wide workspace panel doesn't mean wide paragraphs. */}
      <div className={proseClassName}>
        {/*
          NEVER add rehype-raw (or any plugin enabling raw HTML passthrough)
          here. This is user-authored markdown rendered for arbitrary
          visitors — allowing raw HTML would be a stored XSS hole, and the
          app's auth token sits in localStorage specifically on the
          assumption that this renderer never executes injected HTML.
          The `::video{...}` directive support (markdownRemarkPlugins) never
          passes author-supplied strings through as markup either — see
          remarkVideoDirective.ts. See CLAUDE.md.
        */}
        <ReactMarkdown remarkPlugins={markdownRemarkPlugins} components={markdownComponents}>
          {note.content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
