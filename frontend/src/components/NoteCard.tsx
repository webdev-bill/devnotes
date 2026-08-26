import type { Note } from '../api/types'
import TagPills from './TagPills'

export default function NoteCard({ note }: { note: Note }) {
  return (
    <div className="rounded-md border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium text-gray-900">{note.title}</h3>
        {note.language && (
          <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
            {note.language}
          </span>
        )}
      </div>
      <div className="mt-2">
        <TagPills tags={note.tags} />
      </div>
    </div>
  )
}
