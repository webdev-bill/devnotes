import { Link } from 'react-router'

export default function Home() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-3xl font-semibold text-ink">devnotes</h1>
      <p className="mx-auto mt-4 max-w-md text-ink/70">
        A self-hosted vault of code snippets and notes, plus a blog documenting how it was
        built.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link
          to="/notes"
          className="rounded-md bg-keyword px-4 py-2 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
        >
          Browse notes
        </Link>
        <Link
          to="/blog"
          className="rounded-md border border-rule px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          Read the blog
        </Link>
      </div>
    </div>
  )
}
