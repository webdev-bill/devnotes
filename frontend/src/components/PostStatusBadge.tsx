import { getPostStatus, postStatusStyle } from '../lib/postStatus'

export default function PostStatusBadge({ publishedAt }: { publishedAt: string | null }) {
  const status = getPostStatus(publishedAt)
  const { dot, text } = postStatusStyle[status]

  return (
    <span className={`inline-flex items-center gap-1.5 font-display text-xs ${text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  )
}
