import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { createPost, deletePost, getMyPost, updatePost } from '../../api/blogPosts'
import type { BlogPostPayload } from '../../api/types'
import BlogFormFields from '../../components/BlogForm'
import ErrorState from '../../components/ErrorState'
import LoadingState from '../../components/LoadingState'
import { useFetch } from '../../hooks/useFetch'

export default function BlogForm() {
  const { slug } = useParams<{ slug: string }>()
  const isEditing = slug !== undefined
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Only fetch when editing — creating needs no existing data to load, and
  // must not hit the API with a request for a nonexistent "undefined" slug.
  const state = useFetch(() => (slug ? getMyPost(slug) : Promise.resolve(undefined)), [slug])

  async function handleSubmit(payload: BlogPostPayload) {
    if (isEditing) {
      await updatePost(slug, payload)
    } else {
      await createPost(payload)
    }
    navigate('/my/blog')
  }

  async function handleDelete() {
    if (!slug) return
    if (!confirm("Delete this post? This can't be undone.")) return

    setDeleteError(null)
    setDeleting(true)
    try {
      await deletePost(slug)
      navigate('/my/blog')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete post.')
      setDeleting(false)
    }
  }

  if (isEditing && state.status === 'loading') return <LoadingState />
  if (isEditing && state.status === 'error') return <ErrorState message={state.message} />

  return (
    <div className="max-w-3xl">
      <p className="font-display text-xs text-ink/40">
        {isEditing ? `~/blog/${slug}.md` : '~/blog/new.md'}
      </p>
      <h1 className="mt-1 font-display text-xl font-semibold text-ink">
        {isEditing ? 'Edit post' : 'New post'}
      </h1>
      <div className="mt-6">
        <BlogFormFields
          initialPost={isEditing && state.status === 'success' ? state.data : undefined}
          onSubmit={handleSubmit}
        />
      </div>

      {isEditing && (
        <div className="mt-8 border-t border-rule pt-6">
          {deleteError && (
            <p className="mb-3 rounded-md border border-flag/30 bg-flag/5 px-3 py-2 font-body text-sm text-ink">
              {deleteError}
            </p>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md border border-flag/40 px-4 py-2 font-display text-sm font-medium text-flag hover:bg-flag/5 disabled:opacity-50"
          >
            {deleting ? 'deleting…' : 'Delete post'}
          </button>
        </div>
      )}
    </div>
  )
}
