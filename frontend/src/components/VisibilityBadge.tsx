import type { NoteVisibility } from '../api/types'

export default function VisibilityBadge({ visibility }: { visibility: NoteVisibility }) {
  const isPublic = visibility === 'public'

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-display text-xs ${
        isPublic ? 'text-string' : 'text-ink/45'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isPublic ? 'bg-string' : 'bg-ink/30'}`} />
      {isPublic ? 'public' : 'private'}
    </span>
  )
}
