import { Link } from 'react-router'
import { listPublicPosts } from '../api/blogPosts'
import BlogPostCard from '../components/BlogPostCard'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import { useFetch } from '../hooks/useFetch'

export default function BlogList() {
  const state = useFetch(() => listPublicPosts(), [])

  return (
    <div>
      <p className="font-display text-xs text-ink/40">~/blog.md</p>
      <h1 className="mt-1 font-display text-xl font-semibold text-ink">Blog</h1>

      <div className="mt-6 divide-y divide-rule border-t border-rule">
        {state.status === 'loading' && <LoadingState />}
        {state.status === 'error' && <ErrorState message={state.message} />}
        {state.status === 'success' && (
          <>
            {state.data.data.length === 0 ? (
              <p className="py-12 text-center font-display text-sm text-ink">
                <span className="text-ink/35">// </span>no posts yet
              </p>
            ) : (
              state.data.data.map((post, index) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="block hover:bg-paper/60">
                  <BlogPostCard post={post} index={index} />
                </Link>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
