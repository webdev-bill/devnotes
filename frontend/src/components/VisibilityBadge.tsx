import type { NoteVisibility } from '../api/types'

export default function VisibilityBadge({ visibility }: { visibility: NoteVisibility }) {
  const isPublic = visibility === 'public'

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
      }`}
    >
      {isPublic ? 'Public' : 'Private'}
    </span>
  )
}
