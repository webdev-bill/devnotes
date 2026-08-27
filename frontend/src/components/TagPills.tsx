import type { Tag } from '../api/types'

export default function TagPills({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 font-display text-xs text-ink/40">
      {tags.map((tag) => (
        <span key={tag.id}>#{tag.name}</span>
      ))}
    </div>
  )
}
