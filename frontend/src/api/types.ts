export type Tag = {
  id: number
  name: string
  slug: string
}

export type NoteVisibility = 'public' | 'private'

export type Note = {
  id: number
  title: string
  content: string
  language: string | null
  visibility: NoteVisibility
  created_at: string
  updated_at: string
  tags: Tag[]
}

export type NotePayload = {
  title: string
  content: string
  language: string | null
  visibility: NoteVisibility
  tags: string[]
}

export type Paginated<T> = {
  data: T[]
  current_page: number
  last_page: number
  total: number
}

export type Image = {
  id: number
  mime_type: string
  size: number
}

export type BlogPost = {
  id: number
  title: string
  slug: string
  content: string
  published_at: string | null
  created_at: string
  updated_at: string
  cover_image: Image | null
  meta_title: string | null
  meta_description: string | null
  // Always populated — falls back to the site-wide default OG image
  // server-side (see BlogPost::ogImageUrl()), so this is null only when
  // neither a per-post override nor a site default has ever been set.
  og_image_url: string | null
}

export type BlogPostPayload = {
  title: string
  content: string
  published_at: string | null
  meta_title: string | null
  meta_description: string | null
}

export type SiteSettings = {
  site_title: string
  meta_description: string | null
  twitter_handle: string | null
  og_image_url: string | null
  favicon_ico_url: string | null
  favicon_png_url: string | null
}

export type SiteSettingsPayload = {
  site_title: string
  meta_description: string | null
  twitter_handle: string | null
}
