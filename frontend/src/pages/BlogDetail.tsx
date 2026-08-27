import ReactMarkdown from 'react-markdown'
import { useParams } from 'react-router'
import { getPublicPost } from '../api/blogPosts'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import { useFetch } from '../hooks/useFetch'

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>()
  const state = useFetch(() => getPublicPost(slug!), [slug])

  if (state.status === 'loading') return <LoadingState />
  if (state.status === 'error') return <ErrorState message={state.message} />

  const post = state.data

  return (
    <div>
      <p className="border-b border-rule pb-3 font-display text-xs text-ink/40">
        ~/blog/{post.slug}.md
        {post.published_at && <span className="text-ink/60"> {post.published_at.slice(0, 10)}</span>}
      </p>
      <h1 className="mt-4 font-display text-xl font-semibold text-ink">{post.title}</h1>
      {/* Same constraint as NoteDetail — no rehype-raw, no raw HTML
          passthrough. See CLAUDE.md. */}
      <div className="prose mt-6 max-w-2xl">
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </div>
    </div>
  )
}
