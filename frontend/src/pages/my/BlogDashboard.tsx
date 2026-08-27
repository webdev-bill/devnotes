import { useState } from 'react'
import { Link } from 'react-router'
import { deletePost, listMyPosts } from '../../api/blogPosts'
import type { BlogPost } from '../../api/types'
import BlogPostCard from '../../components/BlogPostCard'
import ErrorState from '../../components/ErrorState'
import LoadingState from '../../components/LoadingState'
import PostStatusBadge from '../../components/PostStatusBadge'
import { useFetch } from '../../hooks/useFetch'

export default function BlogDashboard() {
  const state = useFetch(() => listMyPosts(), [])
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete(post: BlogPost) {
    if (!confirm(`Delete "${post.title}"? This can't be undone.`)) return

    setDeleteError(null)
    setDeletingSlug(post.slug)
    try {
      await deletePost(post.slug)
      state.refetch()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete post.')
    } finally {
      setDeletingSlug(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-xs text-ink/40">~/my-blog.md</p>
          <h1 className="mt-1 font-display text-xl font-semibold text-ink">My Blog Posts</h1>
        </div>
        <Link
          to="/my/blog/new"
          className="rounded-md bg-keyword px-4 py-2 font-display text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          + new post
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
                <span className="text-ink/35">// </span>nothing here yet — write your first post
              </p>
            ) : (
              state.data.data.map((post, index) => (
                <div key={post.id} className="flex flex-wrap items-center gap-x-3">
                  <div className="min-w-0 flex-1">
                    <BlogPostCard post={post} index={index} />
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <PostStatusBadge publishedAt={post.published_at} />
                    <Link
                      to={`/my/blog/${post.slug}/edit`}
                      className="font-display text-xs text-keyword hover:underline"
                    >
                      edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(post)}
                      disabled={deletingSlug === post.slug}
                      className="font-display text-xs text-flag hover:underline disabled:opacity-50"
                    >
                      {deletingSlug === post.slug ? 'deleting…' : 'delete'}
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
