import { apiRequest } from './client'
import type { Tag } from './types'

export function listTags(): Promise<Tag[]> {
  return apiRequest('/tags')
}
