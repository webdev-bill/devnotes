import { API_URL, apiRequest } from './client'
import { getToken } from './token'
import type { BlogPost, Image } from './types'

/** Path (not a full URL) for the authorized image-serving route. */
export function imagePath(id: number): string {
  return `/images/${id}`
}

/**
 * Fetch an image's bytes with the stored bearer token attached (when present)
 * and return an object URL for it. A plain <img src="/api/images/:id"> can't
 * attach an Authorization header, so a private note's own owner would
 * otherwise never see their own inline images render — see CLAUDE.md's
 * localStorage-token trade-off. Never puts the token in a URL/query string.
 *
 * Caller owns the returned URL and must revoke it (URL.revokeObjectURL) once
 * done — see MarkdownImage.tsx.
 */
export async function fetchImageObjectUrl(path: string): Promise<string> {
  const token = getToken()
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    throw new Error(`Failed to load image (${response.status})`)
  }

  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

export function uploadNoteImage(noteId: number, file: File): Promise<Image> {
  const form = new FormData()
  form.append('image', file)
  return apiRequest(`/my/notes/${noteId}/images`, { method: 'POST', auth: true, body: form })
}

export function uploadBlogPostCoverImage(slug: string, file: File): Promise<BlogPost> {
  const form = new FormData()
  form.append('image', file)
  return apiRequest(`/my/blog-posts/${slug}/cover-image`, { method: 'POST', auth: true, body: form })
}

export function deleteBlogPostCoverImage(slug: string): Promise<void> {
  return apiRequest(`/my/blog-posts/${slug}/cover-image`, { method: 'DELETE', auth: true })
}
