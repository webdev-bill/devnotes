import type { Note } from '../api/types'
import TagPills from './TagPills'

export default function NoteCard({ note, index }: { note: Note; index: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
      <span className="w-6 shrink-0 select-none text-right font-display text-xs text-ink/30">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="min-w-0 flex-1 truncate font-display text-sm text-ink">{note.title}</span>
      {note.language && (
        <span className="shrink-0 font-display text-xs text-ink/40">[{note.language}]</span>
      )}
      <TagPills tags={note.tags} />
    </div>
  )
}
