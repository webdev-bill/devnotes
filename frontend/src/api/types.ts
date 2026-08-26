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
