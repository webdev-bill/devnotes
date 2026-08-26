import { apiRequest } from './client'
import type { Note, NotePayload, Paginated } from './types'

export type NoteFilters = {
  search?: string
  tag?: string
  visibility?: string
}

export function listPublicNotes(filters: NoteFilters = {}): Promise<Paginated<Note>> {
  return apiRequest('/notes', { params: filters })
}

export function getPublicNote(id: string): Promise<Note> {
  return apiRequest(`/notes/${id}`)
}

export function listMyNotes(filters: NoteFilters = {}): Promise<Paginated<Note>> {
  return apiRequest('/my/notes', { auth: true, params: filters })
}

export function getMyNote(id: string): Promise<Note> {
  return apiRequest(`/my/notes/${id}`, { auth: true })
}

export function createNote(payload: NotePayload): Promise<Note> {
  return apiRequest('/my/notes', { method: 'POST', auth: true, body: payload })
}

export function updateNote(id: string, payload: NotePayload): Promise<Note> {
  return apiRequest(`/my/notes/${id}`, { method: 'PUT', auth: true, body: payload })
}

export function deleteNote(id: string): Promise<void> {
  return apiRequest(`/my/notes/${id}`, { method: 'DELETE', auth: true })
}
