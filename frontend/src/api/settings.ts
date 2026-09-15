import { apiRequest } from './client'
import type { BlogPost, SiteSettings, SiteSettingsPayload } from './types'

export function getPublicSiteSettings(): Promise<SiteSettings> {
  return apiRequest('/site-settings')
}

export function getMySiteSettings(): Promise<SiteSettings> {
  return apiRequest('/my/settings', { auth: true })
}

export function updateSiteSettings(payload: SiteSettingsPayload): Promise<SiteSettings> {
  return apiRequest('/my/settings', { method: 'PUT', auth: true, body: payload })
}

export function uploadFavicon(file: File): Promise<SiteSettings> {
  const form = new FormData()
  form.append('image', file)
  return apiRequest('/my/settings/favicon', { method: 'POST', auth: true, body: form })
}

export function uploadSiteOgImage(file: File): Promise<SiteSettings> {
  const form = new FormData()
  form.append('image', file)
  return apiRequest('/my/settings/og-image', { method: 'POST', auth: true, body: form })
}

export function deleteSiteOgImage(): Promise<void> {
  return apiRequest('/my/settings/og-image', { method: 'DELETE', auth: true })
}

export function uploadBlogPostOgImage(slug: string, file: File): Promise<BlogPost> {
  const form = new FormData()
  form.append('image', file)
  return apiRequest(`/my/blog-posts/${slug}/og-image`, { method: 'POST', auth: true, body: form })
}

export function deleteBlogPostOgImage(slug: string): Promise<void> {
  return apiRequest(`/my/blog-posts/${slug}/og-image`, { method: 'DELETE', auth: true })
}
