import type { Tag } from '../api/types'

export default function TagPills({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
        >
          {tag.name}
        </span>
      ))}
    </div>
  )
}
