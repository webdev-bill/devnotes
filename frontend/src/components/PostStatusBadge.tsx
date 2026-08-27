type PostStatus = 'draft' | 'scheduled' | 'published'

function getStatus(publishedAt: string | null): PostStatus {
  if (!publishedAt) return 'draft'
  return new Date(publishedAt) > new Date() ? 'scheduled' : 'published'
}

const statusStyle: Record<PostStatus, { dot: string; text: string }> = {
  draft: { dot: 'bg-ink/30', text: 'text-ink/45' },
  scheduled: { dot: 'bg-keyword', text: 'text-keyword' },
  published: { dot: 'bg-string', text: 'text-string' },
}

export default function PostStatusBadge({ publishedAt }: { publishedAt: string | null }) {
  const status = getStatus(publishedAt)
  const { dot, text } = statusStyle[status]

  return (
    <span className={`inline-flex items-center gap-1.5 font-display text-xs ${text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  )
}
