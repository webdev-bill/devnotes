import { Helmet } from 'react-helmet-async'
import ReactMarkdown from 'react-markdown'
import { useParams } from 'react-router'
import { getPublicPost } from '../api/blogPosts'
import { API_URL } from '../api/client'
import { imagePath } from '../api/images'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import { useSiteSettings } from '../context/useSiteSettings'
import { useFetch } from '../hooks/useFetch'
import { markdownComponents, markdownRemarkPlugins } from '../markdown/markdownConfig'
import { proseClassName } from '../markdown/proseClassName'

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>()
  const state = useFetch(() => getPublicPost(slug!), [slug])
  const { settings } = useSiteSettings()

  if (state.status === 'loading') return <LoadingState />
  if (state.status === 'error') return <ErrorState message={state.message} />

  const post = state.data
  // Same fallback-to-site-default logic as the server-side bot-preview
  // endpoint (BotPreviewController) — kept in sync deliberately so a real
  // browser and a crawler agree on what a post's title/description/image
  // actually are.
  const metaTitle = post.meta_title ?? post.title
  const metaDescription = post.meta_description ?? settings?.meta_description ?? null

  return (
    <div>
      <Helmet>
        <title>{metaTitle}</title>
        {metaDescription && <meta name="description" content={metaDescription} />}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={metaTitle} />
        {metaDescription && <meta property="og:description" content={metaDescription} />}
        {post.og_image_url && <meta property="og:image" content={post.og_image_url} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        {metaDescription && <meta name="twitter:description" content={metaDescription} />}
        {post.og_image_url && <meta name="twitter:image" content={post.og_image_url} />}
      </Helmet>
      <p className="border-b border-rule pb-3 font-display text-xs text-ink/40">
        ~/blog/{post.slug}.md
        {post.published_at && <span className="text-ink/60"> {post.published_at.slice(0, 10)}</span>}
      </p>
      <h1 className="mt-4 font-display text-xl font-semibold text-ink">{post.title}</h1>
      {post.cover_image && (
        <img
          src={`${API_URL}${imagePath(post.cover_image.id)}`}
          alt=""
          className="mt-4 max-w-2xl rounded-md border border-rule"
        />
      )}
      {/* Same constraint as NoteDetail — no rehype-raw, no raw HTML
          passthrough (the ::video{...} directive support included via
          markdownRemarkPlugins doesn't relax this either — see
          remarkVideoDirective.ts). See CLAUDE.md. */}
      <div className={proseClassName}>
        <ReactMarkdown remarkPlugins={markdownRemarkPlugins} components={markdownComponents}>
          {post.content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
