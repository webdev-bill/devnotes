import { Link } from 'react-router'

export default function Home() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-3xl font-semibold text-gray-900">devnotes</h1>
      <p className="mx-auto mt-4 max-w-md text-gray-600">
        A self-hosted vault of code snippets and notes, plus a blog documenting how it was
        built.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link
          to="/notes"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Browse notes
        </Link>
        <Link
          to="/blog"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Read the blog
        </Link>
      </div>
    </div>
  )
}
