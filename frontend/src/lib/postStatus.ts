export type PostStatus = 'draft' | 'scheduled' | 'published'

export function getPostStatus(publishedAt: string | null): PostStatus {
  if (!publishedAt) return 'draft'
  return new Date(publishedAt) > new Date() ? 'scheduled' : 'published'
}

export const postStatusStyle: Record<PostStatus, { dot: string; text: string }> = {
  draft: { dot: 'bg-ink/30', text: 'text-ink/45' },
  scheduled: { dot: 'bg-keyword', text: 'text-keyword' },
  published: { dot: 'bg-string', text: 'text-string' },
}
